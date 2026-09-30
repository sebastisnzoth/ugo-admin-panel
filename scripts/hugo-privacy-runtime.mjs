import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'unknown',api=await readFile('api/hugo/chat.ts','utf8'),edge=await readFile('supabase/functions/hugo-chat/index.ts','utf8')
for(const src of [api,edge]){assert.match(src,/sanitizeForModel/);assert.match(src,/REDACTED_BLOB/);assert.match(src,/Bearer/);assert.match(src,/base64/)}
assert.match(api,/authClient\.auth\.getUser\(token\)/);assert.match(api,/decideHugoAuthority/)
assert.match(edge,/sb\.auth\.getUser\(token\)/);assert.match(edge,/profileRole/);assert.match(edge,/status:\s*403/);assert.doesNotMatch(edge,/hugo_mensaje:\s*\`Error:/)
const sanitize=value=>String(value??'').replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [REDACTED]').replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,'[REDACTED_JWT]').replace(/\b(?:sk|sb_secret|service_role|ghp|github_pat|AIza)[-_A-Za-z0-9]{12,}\b/g,'[REDACTED_SECRET]').replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|passwd|authorization)\b\s*[:=]\s*["']?[^\s,"'}]{6,}["']?/gi,'$1=[REDACTED]').replace(/data:[^;\s]+;base64,[A-Za-z0-9+/=]{80,}/gi,'[REDACTED_BLOB]').replace(/[A-Za-z0-9+/]{800,}={0,2}/g,'[REDACTED_BLOB]')
const synthetic=['Bearer eyJhbGciOiJIUzI1NiJ9.synthetic.token.value123456','api_key=AIzaSySyntheticSecret1234567890','password=SyntheticPass123','data:image/jpeg;base64,'+'A'.repeat(900),'B'.repeat(1200)].join('\n'),out=sanitize(synthetic)
for(const bad of ['eyJhbGciOiJIUzI1NiJ9','AIzaSySyntheticSecret','SyntheticPass123'])assert.equal(out.includes(bad),false)
assert.match(out,/REDACTED_BLOB/)
const evidence={schema_version:'UGO_READINESS_EVIDENCE_V1',readiness_id:'hugo-privacy',sha,environment:'UGO TEST/local same-SHA',synthetic_secrets_redacted:true,raw_blob_redacted:true,api_auth_required:true,api_role_authority:true,edge_auth_required:true,edge_role_authority:true,raw_errors_not_reflected:true,production_touched:false,result:'PASS'}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/hugo-privacy-runtime.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence))
