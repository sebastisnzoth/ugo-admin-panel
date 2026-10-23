// Explicit opt-in outbound TEST transport. No public Mac listener, no service_role key.
// The server must independently authorize operator, lease ownership and state transitions.
const TEST_URL = 'https://tmossnqfwfwjrtzwcbmm.supabase.co/functions/v1/ugo-hive-local-jobs';
export function createHiveTestTransport({token, fetchImpl=globalThis.fetch, endpoint=TEST_URL}={}) {
  if (endpoint !== TEST_URL) throw Error('HIVE_TEST_ENDPOINT_REQUIRED');
  if (typeof token !== 'string' || token.length < 32 || /\s/.test(token))
    throw Error('HIVE_WORKER_TOKEN_REQUIRED');
  if (typeof fetchImpl !== 'function') throw Error('HIVE_FETCH_REQUIRED');
  async function request(action, data={}) {
    let response;
    try {
      response=await fetchImpl(endpoint,{
        method:'POST', redirect:'error', cache:'no-store',
        signal:AbortSignal.timeout(12000),
        headers:{'authorization':'Bearer '+token,'content-type':'application/json'},
        body:JSON.stringify({action,...data})
      });
    } catch {throw Error('HIVE_TEST_TRANSPORT_UNREACHABLE');}
    if(response.status===401||response.status===403) throw Error('HIVE_TEST_WORKER_UNAUTHORIZED');
    if(response.status===429) throw Error('HIVE_TEST_RATE_LIMITED');
    if(!response.ok) throw Error('HIVE_TEST_TRANSPORT_FAILED');
    const raw=await response.text();
    if(raw.length>20000) throw Error('HIVE_TEST_REPLY_TOO_LARGE');
    let decoded;
    try {decoded=JSON.parse(raw);} catch {throw Error('HIVE_TEST_REPLY_INVALID');}
    if(!decoded || typeof decoded!=='object'||Array.isArray(decoded))
      throw Error('HIVE_TEST_REPLY_INVALID');
    return decoded;
  }
  return {
    claim:async()=>{
      const data=await request('claim');
      if(data.job===null) return null;
      if(!data.job||typeof data.job!=='object'||Array.isArray(data.job))
        throw Error('HIVE_TEST_CLAIM_INVALID');
      return data.job;
    },
    complete:async outcome=>{
      if(!outcome||typeof outcome!=='object'||Array.isArray(outcome)||
        typeof outcome.id!=='string'||typeof outcome.lease!=='string'||
        !['SUCCEEDED','FAILED'].includes(outcome.status)||
        Object.keys(outcome).some(k=>!['id','lease','status','answer','model','code'].includes(k)))
        throw Error('HIVE_TEST_COMPLETION_INVALID');
      const result=await request('complete',{outcome});
      if(result.ok!==true) throw Error('HIVE_TEST_COMPLETION_REJECTED');
      return result;
    }
  };
}
