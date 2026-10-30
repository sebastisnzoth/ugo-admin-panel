import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8')

test('Faxina request requires duration and collects optional supplies checkbox only for cleaning',async()=>{
 const need=await read('src/features/client/request/ClientNeedScreen.tsx')
 assert.match(need,/isFaxina=/)
 assert.match(need,/validFaxinaHours/)
 assert.match(need,/faxinaNeedsProducts/)
 assert.match(need,/\[2,3,4,6,8\]/)
 assert.match(need,/faxinaHours:isFaxina\?hoursNumber:null/)
})

test('Faxina service metadata carries duration for calendar and request preference for provider',async()=>{
 const create=await read('src/features/client/request/ClientPostConfirmFlow.tsx')
 assert.match(create,/estimated_duration_minutes:faxinaHours\*60/)
 assert.match(create,/faxina_supplies_requested:Boolean\(draft\.faxinaNeedsProducts\)/)
 assert.match(create,/faxina_supplies_approved/)
 assert.match(create,/aprobar_productos_faxina/)
 const provider=await read('src/mvp/provider/providerData.tsx')
 assert.match(provider,/faxina_supplies_requested/)
 assert.match(provider,/faxina_supplies_approved/)
})

test('Only a provider who selects Faxina sees supplies fee editor',async()=>{
 const editor=await read('src/mvp/provider/ProviderCategoriesEditor.tsx')
 const price=await read('src/mvp/provider/ProviderFaxinaSuppliesSettings.tsx')
 assert.match(editor,/selectedFaxina&&<ProviderFaxinaSuppliesSettings\/>/)
 assert.match(price,/faxina_productos_lleva/)
 assert.match(price,/faxina_productos_valor/)
 assert.match(price,/min="0.01" max="1000"/)
})

test('Supplies fee in database requires client ownership, assignment, explicit approval and one-time charge',async()=>{
 const migration=await read('supabase/migrations/20261029213000_faxina_hours_supplies_pricing.sql')
 assert.match(migration,/s\.cliente_id=\(select auth\.uid\(\)\)/)
 assert.match(migration,/cliente_id=\(select auth\.uid\(\)\) for update/)
 assert.match(migration,/v_service\.estado <> 'asignado'/)
 assert.match(migration,/FEE_CHANGED_OR_UNAVAILABLE/)
 assert.match(migration,/PAYMENT_ALREADY_STARTED/)
 assert.match(migration,/faxina_supplies_approved/)
 assert.match(migration,/grant execute on function public\.aprobar_productos_faxina/)
})


test('Faxina residence inputs are dropdowns, validated and isolated to cleaning requests',async()=>{
 const need=await read('src/features/client/request/ClientNeedScreen.tsx')
 assert.match(need,/isFaxina&&<fieldset/)
 assert.match(need,/ugo-faxina-residence-type/)
 assert.match(need,/ugo-faxina-rooms/)
 assert.match(need,/ugo-faxina-bedrooms/)
 assert.match(need,/ugo-faxina-bathrooms/)
 assert.match(need,/FAXINA_AMBIENTES=Array\.from\(\{length:12\}/)
 assert.match(need,/FAXINA_DORMITORIOS=Array\.from\(\{length:11\}/)
 assert.match(need,/FAXINA_BANHEIROS=Array\.from\(\{length:8\}/)
 assert.match(need,/validFaxinaResidence/)
 assert.match(need,/validFaxinaHours&&validFaxinaResidence/)
 assert.match(need,/faxinaResidenceType:isFaxina\?faxinaResidenceType:null/)
 assert.match(need,/faxinaRooms:isFaxina\?Number\(faxinaRooms\):null/)
 assert.match(need,/faxinaBedrooms:isFaxina\?Number\(faxinaBedrooms\):null/)
 assert.match(need,/faxinaBathrooms:isFaxina\?Number\(faxinaBathrooms\):null/)
})
test('Faxina residence is shown in the summary and persists in service metadata and provider preferences',async()=>{
 const summary=await read('src/features/client/request/ClientSummaryScreen.tsx')
 const confirm=await read('src/features/client/request/ClientPostConfirmFlow.tsx')
 for(const key of ['faxinaResidenceType','faxinaRooms','faxinaBedrooms','faxinaBathrooms'])assert.match(summary,new RegExp(key))
 for(const key of ['faxina_residence_type:residenceType','faxina_rooms:faxinaRooms','faxina_bedrooms:faxinaBedrooms','faxina_bathrooms:faxinaBathrooms'])assert.ok(confirm.includes(key),key)
 assert.match(confirm,/preferences:`\$\{faxinaHours\} h de Faxina · \$\{residenceLabel\}/)
 assert.match(confirm,/if\(isFaxina&&\(!\['casa','apartamento','outro'\]\.includes\(residenceType\)/)
 assert.match(confirm,/draft\.faxinaRooms==null\|\|draft\.faxinaBedrooms==null\|\|draft\.faxinaBathrooms==null/)
})
test('Faxina residence selection is translated in Portuguese, Spanish and English',async()=>{
 const source=await read('src/i18n/translations/faxina.ts')
 for(const key of ['heading','type','choose','casa','apartamento','outro','rooms','bedrooms','bathrooms','validation'])
  assert.equal((source.match(new RegExp('"faxina\\.residence\\.'+key+'"','g'))||[]).length,3,key)
})
