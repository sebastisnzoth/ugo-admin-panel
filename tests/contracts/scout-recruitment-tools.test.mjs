import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Scout saves prospects without relying on a partial-index upsert',async()=>{
 const src=await read('src/components/ScoutSection.tsx')
 assert.match(src,/function prospectRow\(p:Provider\)/)
 assert.match(src,/rpc\('admin_scout_upsert_candidates',\{p_rows:rows\}\)/)
 assert.doesNotMatch(src,/upsert\(row,\{onConflict:'external_id'\}\)/)
})

test('Scout exports found or selected providers to an Excel-compatible file',async()=>{
 const src=await read('src/components/ScoutSection.tsx')
 assert.match(src,/function exportExcel\(\)/)
 assert.match(src,/application\/vnd\.ms-excel/)
 assert.match(src,/ugo-scout-\$\{categoryId\}-\$\{stamp\}\.xls/)
})

test('Scout recruitment supports explicit multi-select WhatsApp and email actions',async()=>{
 const src=await read('src/components/ScoutSection.tsx')
 assert.match(src,/sendWhatsAppSelected/)
 assert.match(src,/selectedPhones\.slice\(0,20\)/)
 assert.match(src,/openEmailDraft/)
 assert.match(src,/sendSelectedEmailCampaign/)
 assert.match(src,/gmailStatus\.connected/)
 assert.match(src,/bcc=/)
 assert.match(src,/recruitmentText/)
 assert.match(src,/Se não quiser receber novos contatos/)
})

test('Scout preserves public emails returned by discovery sources',async()=>{
 const api=await read('api/scout/places.js')
 assert.match(api,/p\.contact\?\.email/)
 assert.match(api,/t\['contact:email'\]/)
 assert.match(api,/p\.extratags\?\.email/)
})

test('WhatsApp recruitment updates Scout independently from optional legacy invitation audit',async()=>{
 const api=await read('api/whatsapp/send.js')
 const insert=api.indexOf("from('invitaciones_scout').insert")
 const update=api.indexOf("from('prospectos_scouts').update({estado:p?.estado==='prospecto_pendiente'?'invitado':p?.estado")
 assert.ok(insert>0&&update>insert)
 assert.match(api,/invitaciones_scout'[\s\S]*?catch\{\}[\s\S]*?prospectos_scouts/)
 assert.match(api,/ultimo_canal:'whatsapp'/)
 assert.match(api,/contactos_intentos:Number\(p\?\.contactos_intentos\|\|0\)\+1/)
})

test('Scout loads all saved prospects and separates them by category',async()=>{
 const src=await read('src/components/ScoutSection.tsx')
 assert.match(src,/\.range\(from,from\+pageSize-1\)/)
 assert.doesNotMatch(src,/\.limit\(100\)/)
 assert.match(src,/categoryStats/)
 assert.match(src,/visibleProspects/)
 assert.match(src,/CRM SCOUT POR CATEGORÍA/)
 assert.doesNotMatch(src,/prospects\.slice\(0,30\)/)
})

test('Scout recruitment CRM exposes funnel, follow-up, demand priority and editable prospect cards',async()=>{
 const src=await read('src/components/ScoutSection.tsx')
 assert.match(src,/EMBUDO DE RECLUTAMIENTO/)
 assert.match(src,/scout_demanda_categorias/)
 assert.match(src,/pipeline_etapa/)
 assert.match(src,/recruitment_score/)
 assert.match(src,/proximo_contacto_at/)
 assert.match(src,/FICHA SCOUT/)
 assert.match(src,/saveProspectCard/)
 assert.match(src,/registerContact/)
 assert.match(src,/Guardar todos/)
})

test('Scout can enrich public business emails and send opt-in recruitment email through connected Gmail',async()=>{
 const ui=await read('src/components/ScoutSection.tsx')
 const api=await read('api/scout/places.js')
 const gmail=await read('src/server/scoutGmail.js')
 assert.match(ui,/collectPublicEmails/)
 assert.match(ui,/sendSavedEmailCampaign/)
 assert.match(ui,/\/api\/scout\/gmail/)
 assert.match(api,/publicEmailFromWebsite/)
 assert.match(api,/lookup\(host/)
 assert.match(gmail,/gmail\.send/)
 assert.match(gmail,/messages\/send/)
 assert.match(gmail,/scout_email_envios/)
 assert.doesNotMatch(ui,/SCOUT_GMAIL_CLIENT_SECRET/)
})
test('Scout recruitment migration adds CRM stages without removing legacy estado',async()=>{
 const sql=await read('supabase/migrations/20260921211000_scout_recruitment_crm_v1.sql')
 assert.match(sql,/add column if not exists pipeline_etapa/)
 assert.match(sql,/add column if not exists recruitment_score/)
 assert.match(sql,/add column if not exists proximo_contacto_at/)
 assert.match(sql,/add column if not exists no_contactar/)
 assert.match(sql,/create or replace view public\.scout_demanda_categorias/)
 assert.match(sql,/private\.is_admin\(auth\.uid\(\)\)/)
})

test('Scout persistence uses strong server-side dedupe before inserting candidates',async()=>{
 const src=await read('src/components/ScoutSection.tsx')
 assert.match(src,/admin_scout_upsert_candidates/)
 assert.doesNotMatch(src,/\.from\('prospectos_scouts'\)\.insert\(inserts\)/)
})

test('CRM final pass includes today inbox, campaigns, invite links, mass actions, pagination and timeline',async()=>{
 const crm=await read('src/components/ScoutCRM.tsx')
 assert.match(crm,/PARA HACER HOY/)
 assert.match(crm,/scout_campaign_metrics/)
 assert.match(crm,/admin_issue_scout_invitation/)
 assert.match(crm,/sendWhatsappCampaign/)
 assert.match(crm,/bulkUpdate/)
 assert.match(crm,/PAGE_SIZE=100/)
 assert.match(crm,/HISTORIAL COMPLETO/)
 assert.match(crm,/priorityScore/)
})

test('Recruitment contact protection blocks opt-outs and repeated campaign sends server-side',async()=>{
 const wa=await read('api/whatsapp/send.js')
 const api=await read('api/scout/places.js')
 assert.match(wa,/Prospecto marcado como no contactar/)
 assert.match(wa,/cooldown de campaña/)
 assert.match(wa,/recordScoutInbound/)
 assert.match(wa,/opt_out_received/)
 assert.match(wa,/reply_received/)
 assert.match(api,/36\*60\*60\*1000/)
 assert.match(api,/skipped/)
})

test('CRM today inbox flags stalled onboarding and duplicate records for review',async()=>{
 const crm=await read('src/components/ScoutCRM.tsx')
 assert.match(crm,/Onboarding trabado \+48 h/)
 assert.match(crm,/Duplicados a revisar/)
 assert.match(crm,/duplicateIds/)
})

test('invitation claim recognizes an already existing provider account without overwriting its original prospect link',async()=>{
 const sql=await read('supabase/migrations/20260921230000_scout_recruitment_growth_engine.sql')
 assert.match(sql,/u\.prospecto_id is not null and u\.prospecto_id<>p\.id/)
 assert.match(sql,/existing_provider_matched/)
})
