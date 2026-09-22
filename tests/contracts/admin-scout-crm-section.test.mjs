import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Admin navigation exposes CRM as a first-class section next to Scout',async()=>{
 const admin=await read('src/components/AdminPanel.tsx')
 assert.match(admin,/import \{ ScoutCRM \} from '\.\/ScoutCRM'/)
 assert.match(admin,/\|'crm'\|/)
 assert.match(admin,/id:'crm',icon:'◫',label:'CRM'/)
 assert.match(admin,/section==='crm'&&<ScoutCRM\/>/)
})

test('CRM loads the complete Scout prospect base and subscribes to realtime changes',async()=>{
 const crm=await read('src/components/ScoutCRM.tsx')
 const service=await read('src/features/scout/services/scoutCrmService.ts')
 assert.match(service,/\.range\(from,from\+pageSize-1\)/)
 assert.match(crm,/channel\('admin-scout-crm'\)/)
 assert.match(crm,/postgres_changes/)
 assert.match(crm,/table:'prospectos_scouts'/)
})

test('CRM provides funnel, demand, filtering, follow-up and prospect cards',async()=>{
 const crm=await read('src/components/ScoutCRM.tsx')
 assert.match(crm,/Embudo completo/)
 const service=await read('src/features/scout/services/scoutCrmService.ts')
 assert.match(service,/scout_demanda_categorias/)
 assert.match(crm,/Seguimientos vencidos/)
 assert.match(crm,/recruitment_score/)
 assert.match(crm,/proximo_contacto_at/)
 assert.match(crm,/FICHA CRM/)
 assert.match(crm,/Guardar cambios/)
})

test('CRM supports recontact and recruiting campaigns without exposing provider secrets',async()=>{
 const crm=await read('src/components/ScoutCRM.tsx')
 assert.match(crm,/\/api\/whatsapp\/send/)
 assert.match(crm,/\/api\/scout\/gmail/)
 assert.match(crm,/action:'enrich_emails'/)
 assert.match(crm,/action:'send_campaign'/)
 assert.match(crm,/openBcc/)
 assert.match(crm,/Conectar Gmail/)
 assert.doesNotMatch(crm,/SCOUT_GMAIL_CLIENT_SECRET/)
 assert.doesNotMatch(crm,/TOMTOM_API_KEY/)
})

test('Admin exposes Gmail connection globally even outside Scout and CRM',async()=>{
 const admin=await read('src/components/AdminPanel.tsx')
 assert.match(admin,/✉ Conectar Gmail/)
 assert.match(admin,/gmail-top/)
 assert.match(admin,/\/api\/scout\/gmail/)
 assert.match(admin,/connectScoutGmail/)
 assert.match(admin,/Gmail · \$\{scoutGmail\.email/)
})
