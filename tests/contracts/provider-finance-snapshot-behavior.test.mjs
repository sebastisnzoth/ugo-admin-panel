import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'

const source=readFileSync('src/mvp/provider/providerData.tsx','utf8')
const expression=source.split('\n').find(line=>line.trim().startsWith('const released=payments.filter'))
const calculate=new Function('payments','debts',`${expression};return {released,retained,cashReceived,ugoDebt}`)
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'

test('provider totals match isolated backend saldo rules with cash, demo and withdrawals',async()=>{
 const db=new PGlite()
 try{
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema private;
   create function auth.uid() returns uuid language sql stable as $$select '${uid}'::uuid$$;
   create table public.usuarios(id uuid,tipo text,activo boolean);
   create table public.pagos(proveedor_id uuid,ambiente text,estado text,metodo text,ganancia_proveedor numeric,monto_bruto numeric);
   create table public.retiros(proveedor_id uuid,ambiente text,estado text,monto numeric);
   insert into public.usuarios values ('${uid}','proveedor',true);
   insert into public.pagos values
    ('${uid}','real','liberado','pix',85,100),('${uid}','real','liberado',null,17,20),
    ('${uid}','real','liberado','efectivo',170,200),('${uid}','demo','liberado','pix',999,999),
    ('${uid}','real','retenido','pix',42.50,50),('${uid}','demo','retenido','pix',999,999),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','real','liberado','pix',999,999);
   insert into public.retiros values ('${uid}','real','pagado',30),('${uid}','real','pendiente',20),('${uid}','real','fallido',99),('${uid}','demo','pagado',99);`)
  const migration=readFileSync('supabase/migrations/20260920072000_provider_digital_balance_cash_exclusion.sql','utf8')
  await db.exec(migration.slice(0,migration.indexOf('create or replace function public.solicitar_retiro')))
  const backend=(await db.query('select * from public.saldo_proveedor()')).rows[0]
  const payments=(await db.query(`select * from public.pagos where proveedor_id='${uid}'`)).rows
  const debts=[{ambiente:'real',estado:'pendiente',saldo_pendiente:30},{ambiente:'real',estado:'informado',saldo_pendiente:15},{ambiente:'demo',estado:'pendiente',saldo_pendiente:999},{ambiente:'real',estado:'pagado',saldo_pendiente:12}]
  await db.exec("create table public.deudas_ugo_proveedor(ambiente text,estado text,saldo_pendiente numeric); insert into public.deudas_ugo_proveedor values ('real','pendiente',30),('real','informado',15),('demo','pendiente',999),('real','pagado',12)")
  const ledger=(await db.query("select coalesce(sum(saldo_pendiente),0) as total from public.deudas_ugo_proveedor where ambiente='real' and estado not in ('pagado','anulado') and saldo_pendiente>0")).rows[0]
  const ui=calculate(payments,debts)
  assert.equal(ui.released,Number(backend.total_liberado));assert.equal(ui.retained,Number(backend.saldo_procesando))
  assert.equal(Number(backend.total_retirado),50);assert.equal(Number(backend.saldo_disponible),52)
  assert.equal(ui.cashReceived,200);assert.equal(ui.ugoDebt,Number(ledger.total));assert.equal(ui.ugoDebt,45)
 }finally{await db.close()}
})
