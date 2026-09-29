import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const migration=fs.readFileSync(new URL('../../supabase/migrations/20260929222000_provider_offer_reject_execute_hardening.sql',import.meta.url),'utf8')
const source=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')

test('provider reject RPC is authenticated-only at public and private surfaces',()=>{
 assert.match(migration,/revoke all on function public\.rechazar_oferta\(uuid\) from public/i)
 assert.match(migration,/revoke all on function public\.rechazar_oferta\(uuid\) from anon/i)
 assert.match(migration,/grant execute on function public\.rechazar_oferta\(uuid\) to authenticated/i)
 assert.match(migration,/revoke all on function private\.rechazar_oferta_impl\(uuid\) from public/i)
 assert.match(migration,/revoke all on function private\.rechazar_oferta_impl\(uuid\) from anon/i)
})

test('provider reject is serialized, ownership-scoped and backend-idempotent',()=>{
 assert.match(migration,/select \* into v_oferta[\s\S]*where id = p_oferta_id[\s\S]*for update/i)
 assert.match(migration,/v_oferta\.proveedor_id <> v_uid/)
 assert.match(migration,/if v_oferta\.estado = 'rechazada' then[\s\S]*return/i)
 assert.match(migration,/if v_oferta\.estado <> 'pendiente' then[\s\S]*La oferta ya no está disponible/i)
 assert.match(migration,/where id=p_oferta_id[\s\S]*and proveedor_id=v_uid[\s\S]*and estado='pendiente'/i)
})

test('provider reject frontend also reconciles ambiguous transport failures',()=>{
 assert.match(source,/persistedRejectedOpportunity\(supabase:SupabaseClient,opportunityId:string\):Promise<boolean\|null>/)
 assert.match(source,/eq\('id',opportunityId\)\.eq\('proveedor_id',userId\)/)
 assert.match(source,/if\(persisted===true\)return/)
})
