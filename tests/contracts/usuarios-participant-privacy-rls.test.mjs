import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const migration=readFileSync(new URL('../../supabase/migrations/20261025113000_usuarios_participant_privacy.sql',import.meta.url),'utf8')
const read=(path)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')

test('usuarios RLS exposes full rows only to owner or Admin',()=>{
 assert.match(migration,/DROP POLICY IF EXISTS usuarios_select ON public\.usuarios/)
 assert.match(migration,/CREATE POLICY usuarios_select ON public\.usuarios FOR SELECT TO authenticated/)
 assert.match(migration,/USING \(id = \(SELECT auth\.uid\(\)\) OR \(SELECT private\.is_admin\(auth\.uid\(\)\)\)\)/)
 assert.doesNotMatch(migration,/CREATE POLICY usuarios_select[\s\S]*?USING\s*\([^;]*\bactivo\s+OR/)
})

test('counterpart RPC filters by participant ownership and exposes no contact PII',()=>{
 assert.match(migration,/CREATE OR REPLACE FUNCTION public\.obter_perfiles_participantes\(p_ids uuid\[\]\)/)
 assert.match(migration,/RETURNS TABLE\(id uuid, nombre text, apellido text, foto_url text, karma numeric\)/)
 assert.match(migration,/SECURITY DEFINER\s+SET search_path = ''/)
 assert.match(migration,/s\.cliente_id = auth\.uid\(\) AND s\.proveedor_id = u\.id/)
 assert.match(migration,/s\.proveedor_id = auth\.uid\(\) AND s\.cliente_id = u\.id/)
 assert.match(migration,/cardinality\(p_ids\) BETWEEN 1 AND 20/)
 assert.match(migration,/REVOKE ALL ON FUNCTION public\.obter_perfiles_participantes\(uuid\[\]\) FROM PUBLIC, anon, authenticated/)
 assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.obter_perfiles_participantes\(uuid\[\]\) TO authenticated/)
 for(const sensitive of ['email','telefono','endereco','lat','lng'])assert.doesNotMatch(migration.split('RETURNS TABLE(')[1].split(')')[0],new RegExp('\\b'+sensitive+'\\b'))
})

test('cross-user UI reads use scoped RPC, while account/self/Admin reads remain untouched',()=>{
 for(const path of ['src/mvp/ServiceChat.tsx','src/mvp/provider/ProviderCustomerCard.tsx','src/mvp/ProviderRatingPrompt.tsx','src/features/client/rating/ClientRatingPrompt.tsx']){
  const src=read(path)
  assert.match(src,/rpc\('obter_perfiles_participantes'/,path)
  assert.doesNotMatch(src,/from\('usuarios'\)/,path)
 }
 const legacy=read('public/client.html')
 assert.match(legacy,/from\('usuarios_publicos'\)/)
 assert.match(legacy,/from\('usuarios'\)\.update/)
 assert.match(legacy,/from\('usuarios'\)\.upsert/)
 assert.doesNotMatch(legacy,/from\('usuarios_publicos'\)\.update|from\('usuarios_publicos'\)\.upsert/)
 assert.match(migration,/round\(u\.lat::numeric, 2\)/)
 assert.match(migration,/round\(u\.lng::numeric, 2\)/)
 assert.doesNotMatch(migration.split('CREATE OR REPLACE VIEW')[1].split('REVOKE ALL ON TABLE')[0],/u\.email|u\.telefono|u\.endereco/)
})

test('P0 real E2E includes positive/negative authorization checks after acceptance',()=>{
 const e2e=read('scripts/p0-client-provider-e2e.mjs')
 assert.match(e2e,/P0_PROVIDER_CAN_READ_CLIENT_PRIVATE_ROW/)
 assert.match(e2e,/P0_CLIENT_CAN_READ_PROVIDER_PRIVATE_ROW/)
 assert.match(e2e,/P0_ANON_COUNTERPART_RPC_ALLOWED/)
 assert.match(e2e,/P0_COUNTERPART_CONTAINS_PRIVATE_FIELD/)
 assert.match(e2e,/privacy_rls_positive_negative/)
})
