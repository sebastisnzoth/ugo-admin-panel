import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Scout saves prospects without relying on a partial-index upsert',async()=>{
 const src=await read('src/components/ScoutSection.tsx')
 assert.match(src,/function prospectRow\(p:Provider\)/)
 assert.match(src,/from\('prospectos_scouts'\)\.insert\(inserts\)/)
 assert.match(src,/const\{estado:_,\.\.\.patch\}=prospectRow\(p\)/)
 assert.match(src,/from\('prospectos_scouts'\)\.update\(patch\)\.eq\('id'/)
 assert.doesNotMatch(src,/upsert\(row,\{onConflict:'external_id'\}\)/)
 assert.doesNotMatch(src,/update\(prospectRow\(p\)\)/)
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

test('WhatsApp recruitment updates Scout status even when optional invitation audit table is missing',async()=>{
 const api=await read('api/whatsapp/send.js')
 const insert=api.indexOf("from('invitaciones_scout').insert")
 const update=api.indexOf("from('prospectos_scouts').update({estado:'invitado'})")
 assert.ok(insert>0&&update>insert)
 assert.match(api,/invitaciones_scout'[\s\S]*?catch\{\}try\{await sb\.from\('prospectos_scouts'\)\.update/)
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

test('Scout can enrich public business emails and send opt-in recruitment email through server-side credentials',async()=>{
 const ui=await read('src/components/ScoutSection.tsx')
 const api=await read('api/scout/places.js')
 assert.match(ui,/collectPublicEmails/)
 assert.match(ui,/sendSavedEmailCampaign/)
 assert.match(api,/publicEmailFromWebsite/)
 assert.match(api,/lookup\(host/)
 assert.match(api,/process\.env\.RESEND_API_KEY/)
 assert.match(api,/action==='email_campaign'/)
 assert.doesNotMatch(ui,/RESEND_API_KEY/)
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
