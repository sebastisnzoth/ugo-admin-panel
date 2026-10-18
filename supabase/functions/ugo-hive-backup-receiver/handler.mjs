const MAX_BYTES = 8 * 1024 * 1024;
const magic = new Uint8Array([70,65,80,73,66,75,49,0]);
export async function sha256(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function readBounded(req, limit) {
  if (Number(req.headers.get('content-length')) > limit) throw new Error('TOO_LARGE');
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts=[]; let size=0;
  try {
    for (;;) {
      const {done,value}=await reader.read(); if(done) break;
      size+=value.byteLength; if(size>limit) throw new Error('TOO_LARGE'); parts.push(value);
    }
  } finally { await reader.cancel(); }
  const result=new Uint8Array(size); let offset=0;
  for(const p of parts){result.set(p,offset);offset+=p.byteLength;} return result;
}
// Store implements immutable put/get, a transactional CAS commit, and deletion.
// Neither this handler nor the store receives the SQLite decryption keys.
export function createBackupHandler({ token, store, projectUrl }) {
  const reply=(status,code,headers={})=>new Response(code ? JSON.stringify({code}) : null,
    {status,headers:{'cache-control':'no-store','content-type':'application/json',...headers}});
  return async req=> {
    if(projectUrl!=='https://tmossnqfwfwjrtzwcbmm.supabase.co' || !token || token.length<32)
      return reply(503,'BACKUP_NOT_CONFIGURED');
    // Fixed-length digests avoid token-length-dependent comparison.
    const actual=await sha256(new TextEncoder().encode(req.headers.get('authorization')||''));
    const expected=await sha256(new TextEncoder().encode('Bearer '+token));
    let mismatch=0; for(let i=0;i<actual.length;i++) mismatch|=actual.charCodeAt(i)^expected.charCodeAt(i);
    if(mismatch) return reply(401,'UNAUTHORIZED');
    if(!['GET','PUT'].includes(req.method)) return reply(405,'METHOD_NOT_ALLOWED');
    if(new URL(req.url).search) return reply(400,'QUERY_NOT_ALLOWED');
    try {
      // Failed deletes remain durable; cleanup never deletes referenced committed versions.
      await store.cleanup().catch(()=>{});
      if(req.method==='GET') {
        const current=await store.current();
        if(!current) return reply(404,'NO_BACKUP');
        const age=Date.now()-Date.parse(current.created_at);
        if(!Number.isFinite(age) || age<0 || age>86400000) return reply(409,'BACKUP_REQUIRES_FRESHNESS_REVIEW');
        const blob=await store.get(current.object_key);
        if(blob.length!==current.bytes || await sha256(blob)!==current.sha256) return reply(502,'BACKUP_INTEGRITY_FAILED');
        return new Response(blob,{headers:{'cache-control':'no-store','content-type':'application/octet-stream',etag:'"'+current.version+'"'}});
      }
      if(req.headers.get('content-type')?.split(';')[0]!=='application/octet-stream') return reply(415,'BINARY_REQUIRED');
      // Empty-store provisioning requires a one-time, separately authorized operation.
      // Runtime PUTs always require a current ETag; no force/rollback API is exposed.
      const match=req.headers.get('if-match');
      if(!/^"[0-9a-f-]{36}"$/.test(match||'')) return reply(428,'IF_MATCH_REQUIRED');
      const expectedVersion=match.slice(1,-1);
      const current=await store.current();
      if(!current || current.version!==expectedVersion) return reply(412,'STALE_BACKUP');
      const blob=await readBounded(req,MAX_BYTES);
      if(blob.length<=36 || !magic.every((x,i)=>blob[i]===x)) return reply(400,'INVALID_ENVELOPE');
      const version=crypto.randomUUID(); const key='snapshots/'+version;
      if(!await store.stage(version)) return reply(429,'BACKUP_CLEANUP_BACKLOG',{'retry-after':'300'});
      await store.put(key,blob);
      let result;
      try { result=await store.commit(expectedVersion,version,await sha256(blob),blob.length); }
      catch { // Commit may have succeeded before a lost response. Keep the blob for reconciliation.
        return reply(503,'COMMIT_OUTCOME_UNKNOWN');
      }
      if(!result.ok) { await store.remove([key]); await store.ack([key]); return reply(412,'STALE_BACKUP'); }
      // Cleanup failure cannot undo a successful committed snapshot. Report via metrics, not credentials.
      // Pruned versions are queued transactionally with a one-hour grace period.
      // Keep bytes available for a GET that started before the pointer advanced.
      return reply(204,null,{etag:'"'+version+'"'});
    } catch(err) { return reply(err?.message==='TOO_LARGE'?413:503,err?.message==='TOO_LARGE'?'TOO_LARGE':'BACKUP_STORE_UNAVAILABLE'); }
  };
}
