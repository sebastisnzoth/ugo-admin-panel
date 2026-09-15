import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const cascade=fs.readFileSync('api/cascade.js','utf8')
const proxy=fs.readFileSync('api/proxy.js','utf8')
const dispatch=fs.readFileSync('src/lib/dispatch/supabaseDispatch.ts','utf8')
const vercel=fs.readFileSync('vercel.json','utf8')

test('legacy cascade cannot reach Supabase, WhatsApp or matching mutations',()=>{
 assert.doesNotMatch(cascade,/byajcqrgetloavrgyqak|config_backend|graph\.facebook\.com|notificar_nuevo_pedido/)
 assert.match(cascade,/status\(410\)/)
 assert.match(cascade,/UGO_LEGACY_CASCADE_RETIRED/)
 assert.match(dispatch,/rpc\('iniciar_matching'/)
 assert.match(dispatch,/rpc\('iniciar_matching_dirigido'/)
})

test('legacy AI proxy is retired while authenticated Admin user creation remains',()=>{
 assert.doesNotMatch(proxy,/byajcqrgetloavrgyqak|config_backend|generativelanguage\.googleapis\.com|api\.groq\.com/)
 assert.match(proxy,/admin\.auth\.getUser\(token\)/)
 assert.match(proxy,/\['admin','superadmin'\]\.includes\(String\(caller\.tipo\)\)/)
 assert.match(proxy,/status\(410\)/)
 assert.match(proxy,/UGO_LEGACY_AI_PROXY_RETIRED/)
 assert.match(vercel,/"source": "\/api\/admin\/create-user"[\s\S]*"destination": "\/api\/proxy\?admin_create_user=1"/)
 assert.match(vercel,/"source": "\/api\/hugo\/gemini"[\s\S]*"destination": "\/api\/test"/)
})
