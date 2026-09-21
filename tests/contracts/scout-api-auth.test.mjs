import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('api/scout/places.js','utf8')

test('Scout external lookup endpoint is pinned to UGO TEST and requires active Admin auth',()=>{
 assert.match(source,/const SUPABASE_URL='https:\/\/tmossnqfwfwjrtzwcbmm\.supabase\.co'/)
 assert.match(source,/const SUPABASE_PUBLISHABLE_KEY='sb_publishable_/)
 assert.match(source,/async function requireAdmin\(req\)/)
 assert.match(source,/global:\{headers:\{Authorization:`Bearer \$\{token\}`\}\}/)
 assert.match(source,/sb\.auth\.getUser\(token\)/)
 assert.match(source,/\['admin','superadmin'\]\.includes\(String\(profile\.tipo\)\)/)
 assert.match(source,/Access-Control-Allow-Headers','content-type,authorization'/)
})

test('Scout authorizes with the UGO TEST publishable key before reading provider API keys or issuing lookups',()=>{
 const authIndex=source.indexOf('await requireAdmin(req)')
 const tomtomIndex=source.indexOf('process.env.TOMTOM_API_KEY')
 const geoapifyIndex=source.indexOf('process.env.GEOAPIFY_API_KEY')
 assert.ok(authIndex>0,'Admin authorization gate must exist')
 assert.ok(tomtomIndex>authIndex,'TomTom key must only be read after authorization')
 assert.ok(geoapifyIndex>authIndex,'Geoapify key must only be read after authorization')
 assert.doesNotMatch(source,/const SERVICE_KEY=/)
 assert.doesNotMatch(source,/UGO TEST service key no configurada/)
})

test('Scout refuses anonymous and non-Admin callers before search execution',()=>{
 assert.match(source,/if\(!token\)throw Object\.assign\(new Error\('Sesión Admin requerida\.'\),\{status:401\}\)/)
 assert.match(source,/throw Object\.assign\(new Error\('Acceso Admin requerido\.'\),\{status:403\}\)/)
 assert.match(source,/try\{await requireAdmin\(req\);\}catch\(e\)/)
})
