import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider evidence runtime proof is fresh, UI-backed, and tied to the protected persistence service',async()=>{
 const runtime=await read('scripts/provider-evidence-runtime.mjs')
 assert.match(runtime,/chromium/)
 assert.match(runtime,/getByPlaceholder\('tu@email\.com'\)/)
 assert.match(runtime,/setInputFiles/)
 assert.match(runtime,/evidencias_servicio/)
 assert.match(runtime,/tipo.*antes/)
 assert.match(runtime,/tipo.*despues/)
 assert.match(runtime,/service-evidence/)
 assert.match(runtime,/autonomous_record_uploaded_media_runtime/)
 assert.match(runtime,/productionTouched:false/)
 // Auth user creation may auto-populate usuarios via database triggers.
 assert.match(runtime,/usuarios'\)\.upsert\(\{id:providerId[\s\S]*?onConflict:'id'/)
 assert.match(runtime,/usuarios'\)\.upsert\(\{id:clientId[\s\S]*?onConflict:'id'/)
 assert.match(runtime,/perfiles_proveedor'\)\.upsert\(\{usuario_id:providerId[\s\S]*?onConflict:'usuario_id'/)
})

test('provider evidence workflow provisions Chromium, serves built TEST UI, and gates PR evidence writes',async()=>{
 const workflow=await read('.github/workflows/provider-evidence-runtime.yml')
 assert.match(workflow,/npm install --no-save --package-lock=false playwright@1\.56\.1/)
 assert.match(workflow,/npx playwright install --with-deps chromium/)
 assert.match(workflow,/npm run preview -- --host 127\.0\.0\.1 --port 4173/)
 assert.match(workflow,/curl -fsS "\$UGO_UI_BASE_URL\/\?app=provider"/)
 assert.match(workflow,/github\.event\.pull_request\.head\.sha \|\| github\.sha/)
 assert.match(workflow,/github\.event\.pull_request\.head\.repo\.full_name == github\.repository/)
 assert.match(workflow,/persist-evidence:\s*needs: sentinel[\s\S]*?if: github\.event_name != 'pull_request'/)
 assert.match(workflow,/https:\/\/tmossnqfwfwjrtzwcbmm\.supabase\.co/)
 assert.doesNotMatch(workflow,/trfsjuseqjxlhrxuvdsm/)
})
