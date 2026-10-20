import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

const read=path=>fs.readFile(path,'utf8')
test('canonical client INSERT leaves settlement fields to the backend',async()=>{
 const source=await read('src/features/client/request/ClientPostConfirmFlow.tsx')
 const insertLine=source.split('\n').find(line=>line.includes("const inserted=await supabase.from('servicios').insert("))
 assert.ok(insertLine)
 let payload
 const db={from:()=>({insert:value=>{payload=value;return{select:()=>({single:async()=>({data:{id:'owned-request'},error:null})})}}})}
 const create=new Function('supabase','session','draft','serviceAmount','commission','providerNet','metadata','return(async()=>{'+insertLine+';return inserted})()')
 await create(db,{user:{id:'client'}},{categoryId:'category',description:'Request',address:'Address',when:'now'},120,18,102,{demo:false})
 assert.equal(payload.tarifa,120)
 assert.equal(Object.hasOwn(payload,'comision_ugo'),false)
 assert.equal(Object.hasOwn(payload,'ganancia_proveedor'),false)
})

test('priced client request passes unchanged INSERT RLS; forged settlements and foreign ownership remain rejected',async()=>{
 const db=new PGlite()
 try{
  await db.exec(`
   create role authenticated;create role anon;
   create schema auth;create schema private;
   create function auth.uid() returns uuid language sql stable as $$select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid$$;
   create function private.is_admin(uuid) returns boolean language sql as $$select false$$;
   create function private.is_demo_account(uuid,text) returns boolean language sql as $$select false$$;
   grant usage on schema auth,private to authenticated;
   create table public.servicios(id integer generated always as identity primary key,cliente_id uuid,proveedor_id uuid,estado text,tarifa numeric,comision_ugo numeric,ganancia_proveedor numeric,aceptado_at timestamptz,iniciado_at timestamptz,completado_at timestamptz,cancelado_at timestamptz,ambiente text default 'real',metadata jsonb default '{}');
   alter table public.servicios enable row level security;
   create policy servicios_insert on public.servicios for insert to authenticated with check(cliente_id=auth.uid());
   grant insert on public.servicios to authenticated;grant usage on all sequences in schema public to authenticated;
  `)
  await db.exec(await read('supabase/migrations/20260912203500_service_insert_integrity_guard.sql'))
  await db.exec(await read('supabase/migrations/20260920071000_lock_tariff_snapshot_end_to_end.sql'))
  const files=await fs.readdir('supabase/migrations')
  for(const file of files.filter(file=>file.endsWith('_defer_insert_settlement_until_assignment.sql')))await db.exec(await read('supabase/migrations/'+file))
  await db.exec('set role authenticated')
  const insert=(owner,fields='')=>db.exec(`insert into public.servicios(cliente_id,estado,tarifa,metadata${fields?',comision_ugo,ganancia_proveedor':''}) values('${owner}','buscando',120,'{"tariff_quote":{"precio_referencia":120}}'${fields})`)
  const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  await insert(owner)
  await db.exec(`insert into public.servicios(cliente_id,estado,tarifa) values('${owner}','buscando',120)`)
  await assert.rejects(insert(owner,',1,119'),/row.level security/i)
  await assert.rejects(insert('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),/row.level security/i)
  await db.exec('reset role')
  const created=(await db.query('select tarifa,comision_ugo,ganancia_proveedor from public.servicios')).rows
  assert.equal(created.length,2);assert.equal(Number(created[0].tarifa),120)
  assert.equal(created[0].comision_ugo,null);assert.equal(created[0].ganancia_proveedor,null)
  await db.exec("update public.servicios set proveedor_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'")
  const assigned=(await db.query('select tarifa,comision_ugo,ganancia_proveedor from public.servicios')).rows[0]
  assert.equal(Number(assigned.tarifa),120);assert.equal(Number(assigned.comision_ugo),18);assert.equal(Number(assigned.ganancia_proveedor),102)
 }finally{await db.close()}
})
