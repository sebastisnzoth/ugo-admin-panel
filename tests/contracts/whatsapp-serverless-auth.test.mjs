import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('api/whatsapp/send.js','utf8')

test('WhatsApp serverless stays pinned to UGO TEST and service side effects require Admin auth',()=>{
 assert.match(source,/const SUPABASE_URL='https:\/\/tmossnqfwfwjrtzwcbmm\.supabase\.co'/)
 assert.doesNotMatch(source,/process\.env\.SUPABASE_URL/)
 assert.match(source,/async function authorizeAdmin\(req,sb\)/)
 assert.match(source,/sb\.auth\.getUser\(token\)/)
 assert.match(source,/\['admin','superadmin'\]\.includes\(String\(p\.tipo\)\)/)
 assert.doesNotMatch(source,/return sameOrigin\(req\).*prospecto_id/)
})

test('manual outbox processing cannot send WhatsApp without an Admin Bearer session',()=>{
 assert.match(source,/process_outbox\|\|'\)===\s*'1'\)\{if\(!\(await authorizeAdmin\(req,sb\)\)\)return res\.status\(401\)/)
})

test('direct outbound WhatsApp cannot use same-origin as an authorization bypass',()=>{
 assert.match(source,/if\(!\(await authorizeAdmin\(req,sb\)\)\)return res\.status\(401\)\.json\(\{error:'Sesión Admin requerida para enviar WhatsApp\.'\}\)/)
 assert.match(source,/if\(origin&&sameOrigin\(req\)\)res\.setHeader\('Access-Control-Allow-Origin',origin\)/)
})

test('Meta inbound webhook fails closed when the private hook secret is absent or wrong',()=>{
 assert.match(source,/function hookAllowed\(req\)\{return Boolean\(WA_HOOK_SECRET\)&&String\(req\.query\?\.hook\|\|''\)===WA_HOOK_SECRET\}/)
 assert.match(source,/if\(!WA_HOOK_SECRET\)return res\.status\(503\)\.json\(\{received:false,error:'Webhook secret no configurado\.'\}\)/)
 assert.match(source,/if\(!hookAllowed\(req\)\)return res\.status\(403\)\.json\(\{received:false\}\)/)
})

test('Meta verification handshake remains standards-compatible through the verify token',()=>{
 assert.match(source,/mode==='subscribe'&&WA_VERIFY_TOKEN&&token===WA_VERIFY_TOKEN/)
 assert.match(source,/return res\.status\(200\)\.send\(challenge\)/)
})
