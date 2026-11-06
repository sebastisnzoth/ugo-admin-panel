import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
const migration=readFileSync('supabase/migrations/20261105120000_provider_accept_outside_availability.sql','utf8')
const previous=readFileSync('supabase/migrations/20261017081000_provider_zone_acceptance_gate.sql','utf8')
test('only the acceptance availability restriction changes; all atomic safeguards stay intact',()=>{
 const body=s=>s.slice(s.indexOf('CREATE OR REPLACE'))
 const removed="  if not private.proveedor_horario_permite(v_uid,coalesce(v_target_start,now()),v_target_duration) then raise exception 'Fuera de tu agenda de disponibilidad. Ajustá el horario o la fecha libre antes de aceptar.'; end if;"
 assert.equal(body(migration),body(previous).replace(removed,'  -- Explicit acceptance of this offer is allowed outside the configured availability.'))
})
test('accepts outside availability but still blocks real schedule conflicts and debt',async()=>{
 const db=new PGlite()
 try{
 await db.exec(`
 create schema auth; create schema private;
 create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
 create type public.oferta_estado as enum ('pendiente','aceptada','rechazada','expirada');
 create table public.usuarios(id uuid primary key,tipo text,activo boolean);
 create table public.perfiles_proveedor(usuario_id uuid primary key,tarifa_base numeric,estado_verificacion text,online boolean,disponible boolean);
 create table public.servicios(id uuid primary key,proveedor_id uuid,estado text,programado_para timestamptz,metadata jsonb,tarifa numeric,comision_ugo numeric,ganancia_proveedor numeric,aceptado_at timestamptz,updated_at timestamptz,iniciado_at timestamptz);
 create table public.ofertas_servicio(id uuid primary key,servicio_id uuid,proveedor_id uuid,estado public.oferta_estado,expira_at timestamptz,respondida_at timestamptz,tarifa_ofrecida numeric);
 create function private.proveedor_zonas_permitem(uuid,uuid) returns boolean language sql as $$select true$$;
 create function private.proveedor_bloqueado_por_deuda_ugo(uuid) returns boolean language sql as $$select coalesce(current_setting('ugo.debt',true),'off')='on'$$;
 create function private.proveedor_horario_permite(uuid,timestamptz,integer) returns boolean language sql as $$select false$$;
 create function private.service_duration_minutes(jsonb) returns integer language sql as $$select 60$$;
 insert into public.usuarios values ('00000000-0000-0000-0000-000000000001','proveedor',true);
 insert into public.perfiles_proveedor values ('00000000-0000-0000-0000-000000000001',100,'verificado',true,true);
 `)
 await db.exec(migration)
 await db.exec(`insert into servicios(id,estado,programado_para,metadata,tarifa) values ('00000000-0000-0000-0000-000000000010','ofrecido',now()+interval '1 day','{}',100); insert into ofertas_servicio(id,servicio_id,proveedor_id,estado) values ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','pendiente');`)
 const result=await db.query("select (private.aceptar_oferta_impl('00000000-0000-0000-0000-000000000020')).estado as estado")
 assert.equal(result.rows[0].estado,'asignado')
 await db.exec(`insert into servicios(id,estado,programado_para,metadata,tarifa) values ('00000000-0000-0000-0000-000000000011','ofrecido',now()+interval '1 day 15 minutes','{}',100); insert into ofertas_servicio(id,servicio_id,proveedor_id,estado) values ('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','pendiente');`)
 await assert.rejects(db.query("select private.aceptar_oferta_impl('00000000-0000-0000-0000-000000000021')"),/superpone/)
 await db.exec("set ugo.debt = 'on'")
 await assert.rejects(db.query("select private.aceptar_oferta_impl('00000000-0000-0000-0000-000000000021')"),/comisión UGO pendiente/)
 }finally{await db.close()}
})
