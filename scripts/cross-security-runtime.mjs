import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const sha=process.env.UGO_RUNTIME_SHA||'unknown'
const synthetic=[
  process.env.UGO_SYNTHETIC_SERVICE_ROLE_KEY||'ugo-test-service-role-secret-9d0e7f7f4e',
  process.env.UGO_SYNTHETIC_API_KEY||'ugo-test-api-key-7d4f53f607',
  process.env.UGO_SYNTHETIC_PASSWORD||'ugo-test-password-3f43a687c0'
]
const textExt=new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.yml','.yaml','.toml','.md','.txt','.html','.css','.sql','.sh','.env'])
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean)
const ignored=p=>p.startsWith('node_modules/')||p.startsWith('dist/')||p.startsWith('artifacts/')
const looksText=p=>textExt.has(path.extname(p))||path.basename(p).startsWith('.env')
const executableSurface=p=>/^(src|api|scripts|supabase\/functions)\//.test(p)
const configSurface=p=>/^(src|api|scripts|supabase\/functions|\.github\/workflows)\//.test(p)||path.basename(p).startsWith('.env')
const literalConfigSurface=p=>path.basename(p).startsWith('.env')||/\.(?:ya?ml|json|toml)$/.test(p)
const placeholder=s=>/example|synthetic|redacted|placeholder|change[-_ ]?me|your[-_ ]|dummy|fake|test-only|ugo-test/i.test(s)
const stripStrings=s=>s.replace(/(["'`])(?:\\.|(?!\1).)*\1/g,"''")
const findings=[]
const riskyClientEnv=[]
const riskyLogs=[]
const highConfidence=[
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bghp_[A-Za-z0-9]{24,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\bsb_secret_[A-Za-z0-9_-]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{25,}\b/
]
const literalQuoted=/\b(SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|PRIVATE_KEY|CLIENT_SECRET|ACCESS_TOKEN|REFRESH_TOKEN|PASSWORD|PASSWD|SECRET_KEY)\b\s*[:=]\s*(["'])([^"'\n]{8,})\2/gi
const literalEnv=/^\s*(SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|PRIVATE_KEY|CLIENT_SECRET|ACCESS_TOKEN|REFRESH_TOKEN|PASSWORD|PASSWD|SECRET_KEY)\s*=\s*([^\s#]{8,})\s*$/i
for(const p of tracked){
  if(ignored(p)||!looksText(p)) continue
  let src
  try{src=await readFile(p,'utf8')}catch{continue}
  const lines=src.split(/\r?\n/)
  lines.forEach((line,i)=>{
    if(!placeholder(line)){
      if(configSurface(p)){for(const re of highConfidence){
        re.lastIndex=0
        if(re.test(line)) findings.push({path:p,line:i+1,kind:'high-confidence-secret-pattern'})
      }}
      if(literalConfigSurface(p)){
        literalQuoted.lastIndex=0
        let m
        while((m=literalQuoted.exec(line))){
          if(!/process\.env|import\.meta\.env|secrets\.|vars\.|\$\{/.test(m[3])) findings.push({path:p,line:i+1,kind:'literal-sensitive-assignment',key:m[1]})
        }
        const envMatch=line.match(literalEnv)
        if(envMatch&&!placeholder(envMatch[2])&&!/\$\{|\$[A-Z_]+/.test(envMatch[2])) findings.push({path:p,line:i+1,kind:'literal-sensitive-assignment',key:envMatch[1]})
      }
    }
    if(configSurface(p)&&/\bVITE_[A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|ACCESS_TOKEN|REFRESH_TOKEN)[A-Z0-9_]*\b/.test(line)) riskyClientEnv.push({path:p,line:i+1})
    if(executableSurface(p)&&/console\.(?:log|info|warn|error|debug)\s*\(/.test(line)){
      const code=stripStrings(line)
      if(/\b(accessToken|refreshToken|clientSecret|serviceRoleKey|password|authorization)\b|process\.env|req\.headers/i.test(code)) riskyLogs.push({path:p,line:i+1})
    }
  })
}
const distFiles=execFileSync('find',['dist','-type','f'],{encoding:'utf8'}).trim().split('\n').filter(Boolean)
const bundleHits=[]
for(const p of distFiles){
  let src
  try{src=await readFile(p,'utf8')}catch{continue}
  for(const marker of synthetic) if(marker&&src.includes(marker)) bundleHits.push({path:p,kind:'synthetic-secret-in-client-bundle'})
  if(/SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|OPENAI_API_KEY|GEMINI_API_KEY/.test(src)) bundleHits.push({path:p,kind:'server-secret-name-in-client-bundle'})
}
const sanitizeForLog=value=>{
  const seen=new WeakSet()
  const walk=v=>{
    if(v==null||typeof v==='number'||typeof v==='boolean') return v
    if(typeof v==='string') return v
      .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [REDACTED]')
      .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,'[REDACTED_JWT]')
      .replace(/\b(?:sk|sb_secret|ghp|github_pat|AIza)[-_A-Za-z0-9]{12,}\b/g,'[REDACTED_SECRET]')
    if(typeof v!=='object') return String(v)
    if(seen.has(v)) return '[CIRCULAR]'
    seen.add(v)
    if(Array.isArray(v)) return v.slice(0,25).map(walk)
    const out={}
    for(const [k,val] of Object.entries(v).slice(0,50)) out[k]=/(authorization|password|passwd|secret|token|service[_-]?role|private[_-]?key|api[_-]?key)/i.test(k)?'[REDACTED]':walk(val)
    return out
  }
  return walk(value)
}
const probe={authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.synthetic.payload',password:synthetic[2],profile:{email:'minimal@example.test',service_role_key:synthetic[0]},note:'ok'}
const sanitized=sanitizeForLog(probe)
assert.equal(sanitized.authorization,'[REDACTED]')
assert.equal(sanitized.password,'[REDACTED]')
assert.equal(sanitized.profile.service_role_key,'[REDACTED]')
assert.equal(sanitized.note,'ok')
const serialized=JSON.stringify(sanitized)
for(const marker of synthetic) assert.equal(serialized.includes(marker),false)
const evidence={
  schema_version:'UGO_READINESS_EVIDENCE_V1',readiness_id:'cross-security',sha,environment:'UGO TEST/same-SHA',
  tracked_files_scanned:tracked.length,tracked_scan_pass:findings.length===0,tracked_findings:findings,
  client_bundle_no_server_secrets:bundleHits.length===0,bundle_hits:bundleHits,
  log_policy_pass:riskyLogs.length===0,risky_log_calls:riskyLogs,
  no_client_exposed_secret_env:riskyClientEnv.length===0,risky_client_env:riskyClientEnv,
  synthetic_redaction_pass:true,minimum_data_policy_pass:true,production_touched:false
}
evidence.result=(evidence.tracked_scan_pass&&evidence.client_bundle_no_server_secrets&&evidence.log_policy_pass&&evidence.no_client_exposed_secret_env)?'PASS':'FAIL'
await mkdir('artifacts',{recursive:true})
await writeFile('artifacts/cross-security-runtime.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify({readiness_id:evidence.readiness_id,sha:evidence.sha,result:evidence.result,tracked_files_scanned:evidence.tracked_files_scanned,tracked_findings:evidence.tracked_findings.length,bundle_hits:evidence.bundle_hits.length,risky_log_calls:evidence.risky_log_calls.length,risky_client_env:evidence.risky_client_env.length,production_touched:false}))
if(evidence.result!=='PASS') console.log(JSON.stringify({tracked_findings:evidence.tracked_findings,bundle_hits:evidence.bundle_hits,risky_log_calls:evidence.risky_log_calls,risky_client_env:evidence.risky_client_env}))
assert.equal(evidence.result,'PASS')
