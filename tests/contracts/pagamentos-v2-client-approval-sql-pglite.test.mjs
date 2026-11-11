import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

const svc='11111111-1111-4111-8111-111111111111'
const customer='22222222-2222-4222-8222-222222222222'
const professional='33333333-3333-4333-8333-333333333333'
const rpc='select estado,metadata from public.aprobar_trabajo_pix_diferido_test($1)'

async function fixture(){
 const db=new PGlite()
 await db.exec(`
  create role anon;
  create role authenticated;
  create schema private;
  create schema auth;
  create table public.servicios(
    id uuid primary key, cliente_id uuid not null, proveedor_id uuid,
    estado text not null, ambiente text not null, moneda text not null,
    tarifa numeric(10,2) not null, metadata jsonb not null default '{}',
    updated_at timestamptz not null default now());
  create table public.pagos(servicio_id uuid,ambiente text);
  create table public.config_sistema(clave text primary key,valor text);
  create table public.evidencias_servicio(
    servicio_id uuid,usuario_id uuid,tipo text,storage_path text);
  create table private.ugo_pix_after_service_allowed_services(
    service_id uuid primary key,authorized_by uuid not null,expires_at timestamptz not null);
  create function auth.uid() returns uuid language sql stable as
    $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function private.is_demo_service(id uuid) returns boolean language sql
    stable as $$select id='11111111-1111-4111-8111-111111111111'::uuid$$;
  create function private.is_demo_account(id uuid,kind text) returns boolean language sql
    stable as $$select (kind='cliente' and id='22222222-2222-4222-8222-222222222222'::uuid)
      or (kind='proveedor' and id='33333333-3333-4333-8333-333333333333'::uuid)$$;
 `)
 await db.exec(await readFile(new URL('../../docs/sql/ugo_pix_after_service_test_approval_review_only.sql',import.meta.url),'utf8'))
 await db.query(`insert into public.servicios(id,cliente_id,proveedor_id,estado,ambiente,moneda,tarifa,metadata)
  values($1,$2,$3,'esperando_aprobacion','demo','BRL',100,
    '{"requested_payment_method":"pix","payment_timing":"after_service","pix_after_service_authorized":true}'::jsonb)`,
  [svc,customer,professional])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[customer])
 return db
}
test('approval is fail-closed until TEST flag, allowlist and evidence are present',async()=>{
 const db=await fixture()
 try{
  await assert.rejects(db.query(rpc,[svc]),/TEST/)
  await db.query("insert into public.config_sistema values ('ugo_pix_after_service_test_enabled','true')")
  await assert.rejects(db.query(rpc,[svc]),/TEST/)
  await db.query('insert into private.ugo_pix_after_service_allowed_services values($1,$2,now()+interval \'1 day\')',[svc,customer])
  await assert.rejects(db.query(rpc,[svc]),/foto final/)
  await db.query("insert into public.evidencias_servicio values($1,$2,'despues','provider/final.jpg')",[svc,professional])
  const approved=await db.query(rpc,[svc])
  assert.equal(approved.rows[0].estado,'esperando_aprobacion')
  assert.ok(approved.rows[0].metadata.trabajo_aprobado_at)
  const repeated=await db.query(rpc,[svc])
  assert.equal(repeated.rows[0].metadata.trabajo_aprobado_at,approved.rows[0].metadata.trabajo_aprobado_at)
  assert.equal((await db.query('select count(*)::int as n from public.pagos')).rows[0].n,0)
 }finally{await db.close()}
})
test('wrong customer, real service and any prior financial row fail closed',async()=>{
 const db=await fixture()
 try{
  await db.query("insert into public.config_sistema values ('ugo_pix_after_service_test_enabled','true')")
  await db.query('insert into private.ugo_pix_after_service_allowed_services values($1,$2,now()+interval \'1 day\')',[svc,customer])
  await db.query("insert into public.evidencias_servicio values($1,$2,'despues','provider/final.jpg')",[svc,professional])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[professional])
  await assert.rejects(db.query(rpc,[svc]),/no autorizado/)
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[customer])
  await db.query("update public.servicios set ambiente='real' where id=$1",[svc])
  await assert.rejects(db.query(rpc,[svc]),/TEST/)
  await db.query("update public.servicios set ambiente='demo' where id=$1",[svc])
  await db.query("insert into public.pagos values($1,'demo')",[svc])
  await assert.rejects(db.query(rpc,[svc]),/pago previo/)
 }finally{await db.close()}
})
