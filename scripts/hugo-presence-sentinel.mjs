import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const [runtime,client,provider,admin,voice,orb]=await Promise.all([
 fs.readFile('artifacts/hugo-presence-runtime.json','utf8').then(JSON.parse),
 fs.readFile('src/features/client/ui/ClientGlobalSurfaces.tsx','utf8'),
 fs.readFile('src/mvp/provider/ProviderRoot.tsx','utf8'),
 fs.readFile('src/mvp/AdminPhase2.tsx','utf8'),
 fs.readFile('src/mvp/voice.css','utf8'),
 fs.readFile('src/components/ConversationalOrb.tsx','utf8'),
])
assert.equal(runtime.sha,sha)
assert.equal(runtime.readiness_id,'hugo-presence')
assert.match(client,/ClientHugoBridge/)
assert.match(client,/<ClientHugoBridge\/>/)
assert.match(provider,/ProviderHugoBridge/)
assert.match(provider,/<ProviderHugoBridge\/>/)
assert.match(admin,/supabase\.auth\.getSession\(\)/)
assert.doesNotMatch(admin,/supabase\.auth\.getUser\(\)/)
assert.match(admin,/role=\{isSuperAdmin\?'superadmin':'admin'\}/)
assert.match(admin,/<ConversationalOrb/)
assert.match(voice,/\.prototype-hugo\{position:fixed/)
assert.match(voice,/@media\(max-width:720px\)\{\.prototype-hugo\{bottom:78px/)
assert.match(orb,/\.hugo-free-trigger\{position:fixed/)
assert.match(orb,/@media\(max-width:720px\)\{\.hugo-free-trigger\{right:16px;bottom:78px/)
for(const row of runtime.results)assert.equal(row.status,'PASS')

const evidence={
 validator:'Sentinel',
 readiness_id:'hugo-presence',
 sha,
 correlation_id:runtime.correlation_id,
 result:'PASS',
 checks:['client-global-mount','provider-global-mount','admin-authorized-session-role','admin-global-orb','fixed-position-shell','mobile-non-invasive-position','runtime-all-pass'],
 validated_at:new Date().toISOString()
}
await fs.writeFile('artifacts/hugo-presence-sentinel.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
