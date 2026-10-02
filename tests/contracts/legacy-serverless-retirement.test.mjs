import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const proxy=fs.readFileSync('api/proxy.js','utf8')
const dispatch=fs.readFileSync('src/lib/dispatch/supabaseDispatch.ts','utf8')
const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'))

test('legacy cascade serverless endpoint is fully retired and matching stays canonical',()=>{
 assert.equal(fs.existsSync('api/cascade.js'),false,'retired cascade must not consume a Vercel Hobby function slot')
 assert.match(dispatch,/rpc\('iniciar_matching'/)
 assert.match(dispatch,/rpc\('iniciar_matching_dirigido'/)
})

test('legacy AI proxy is retired while authenticated Admin user creation remains',()=>{
 assert.doesNotMatch(proxy,/byajcqrgetloavrgyqak|config_backend|generativelanguage\.googleapis\.com|api\.groq\.com/)
 assert.match(proxy,/admin\.auth\.getUser\(token\)/)
 assert.match(proxy,/\['admin','superadmin'\]\.includes\(String\(caller\.tipo\)\)/)
 assert.match(proxy,/status\(410\)/)
 assert.match(proxy,/UGO_LEGACY_AI_PROXY_RETIRED/)
 assert.ok(vercel.rewrites?.some(r=>r.source==='/api/admin/create-user'&&r.destination==='/api/proxy?admin_create_user=1'))
 assert.ok(vercel.rewrites?.some(r=>r.source==='/api/hugo/gemini'&&r.destination==='/api/test'))
})
