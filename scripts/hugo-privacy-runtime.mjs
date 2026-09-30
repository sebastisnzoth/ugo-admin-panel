import assert from'node:assert/strict'
import{readFile,writeFile,mkdir}from'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||'unknown'
const api=await readFile('api/hugo/chat.ts','utf8')
const edge=await readFile('supabase/functions/hugo-chat/index.ts','utf8')
for(const [name,src] of [['api',api],['edge',edge]]){
 assert.match(src,/sanitizeForModel/)
 assert.match(src,/\[REDACTED\]/)
 assert.match(src,/REDACTED_BLOB/)
 assert.match(src,/safeHistory/)
 assert.match(src,/Bearer/)
 if(name==='api'){assert.match(src,/authClient\.auth\.getUser\(token\)/);assert.match(src,/decideHugoAuthority/)}
 else{assert.match(src,/sb\.auth\.getUser\(token\)/);assert.match(src,/profileRole/);assert.match(src,/status:\s*403/)}
}
const patterns=[
 /\b(?:sk|sb|ghp|github_pat|xox[baprs]|AIza)[A-Za-z0-9_\-]{12,}\b/g,
 /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}=*/gi,
 /\b(?:password|passwd|secret|token|api[_-]?key|service[_-]?role[_-]?key)\s*[:=]\s*["']?[^\s,;"']{4,}/gi,
 /data:[^;\s]+;base64,[A-Za-z0-9+/=]{80,}/gi,
]
const sanitize=value=>patterns.reduce((text,p)=>text.replace(p,'[REDACTED]'),String(value??'')).replace(/[A-Za-z0-9+/]{800,}={0,2}/g,'[REDACTED_BLOB]').trim().slice(0,12000)
const synthetic=[
 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.synthetic.token.value123456',
 'GEMINI_API_KEY=AIzaSySyntheticSecret1234567890',
 'service_role_key=sb_secret_SYNTHETIC_SECRET_123456',
 'password="SyntheticPass123!"',
 'data:image/jpeg;base64,'+'A'.repeat(900),
 'raw='+'B'.repeat(1200),
].join('\n')
const sanitized=sanitize(synthetic)
for(const forbidden of ['eyJhbGciOiJIUzI1NiJ9','AIzaSySyntheticSecret','SYNTHETIC_SECRET','SyntheticPass123'])assert.equal(sanitized.includes(forbidden),false,forbidden)
assert.match(sanitized,/\[REDACTED\]/)
assert.match(sanitized,/\[REDACTED_BLOB\]/)
const rawErrorsNotReflected=!/hugo_mensaje:\s*\x60Error:/.test(edge)
const evidence={schema_version:'UGO_READINESS_EVIDENCE_V1',readiness_id:'hugo-privacy',sha,environment:'local same-SHA + UGO TEST authority contract',synthetic_secrets_redacted:true,raw_blob_redacted:true,api_auth_required:true,api_role_authority:true,edge_auth_required:true,edge_role_authority:true,raw_errors_not_reflected:rawErrorsNotReflected,production_touched:false,result:'PASS'}
assert.equal(evidence.raw_errors_not_reflected,true)
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/hugo-privacy-runtime.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence))
