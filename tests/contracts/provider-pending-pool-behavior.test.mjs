import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
const acceptance=readFileSync('supabase/migrations/20261105120000_provider_accept_outside_availability.sql','utf8')
const pool=readFileSync('supabase/migrations/20261105130000_provider_pending_request_pool.sql','utf8')
test('pending pool lists eligible requests only and claims without duplicating assignment',async()=>{
 const db=new PGlite()
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema private; create schema extensions;
 create domain extensions.geometry as numeric;
 create function extensions.st_y(extensions.geometry) returns numeric language sql as $$select $1$$;
 create function extensions.st_x(extensions.geometry) returns numeric language sql as $$select $1$$;
 create function extensions.st_dwithin(numeric,numeric,numeric) returns boolean language sql as $$select abs($1-$2)<$3$$;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('ugo.actor',true),'')::uuid$$;
 create type public.oferta_estado as enum ('pendiente','aceptada','rechazada','expirada');
 create table public.usuarios(id uuid primary key,tipo text,activo boolean);
 create table public.perfiles_proveedor(usuario_id uuid primary key,tarifa_base numeric,estado_verificacion text,online boolean,disponible boolean,onboarding_completo_at timestamptz,termos_aceitos_at timestamptz,ubicacion numeric,ubicacion_updated_at timestamptz,ubicacion_accuracy_m numeric);
 create table public.categorias(id uuid primary key,nombre text);
 create table public.perfiles_cliente(usuario_id uuid,barrio text,ciudad text);
 create table public.servicios(id uuid primary key,cliente_id uuid,categoria_id uuid,descripcion text,proveedor_id uuid,estado text,programado_para timestamptz,metadata jsonb,tarifa numeric,comision_ugo numeric,ganancia_proveedor numeric,aceptado_at timestamptz,updated_at timestamptz,iniciado_at timestamptz,created_at timestamptz,ubicacion_cliente numeric);
 create table public.ofertas_servicio(id uuid primary key default gen_random_uuid(),servicio_id uuid,proveedor_id uuid,estado public.oferta_estado,expira_at timestamptz,respondida_at timestamptz,tarifa_ofrecida numeric, constraint ofertas_servicio_servicio_id_proveedor_id_key unique(servicio_id,proveedor_id));
 create function private.proveedor_zonas_permitem(uuid,uuid) returns boolean language sql as $$select true$$;
 create function private.proveedor_trabaja_categoria(uuid,uuid) returns boolean language sql as $$select $2='00000000-0000-0000-0000-000000000003'::uuid$$;
 create function private.proveedor_puede_recibir_oferta(uuid,uuid) returns boolean language sql as $$select true$$;
 create function private.provider_operating_radius_m(uuid) returns numeric language sql as $$select 20$$;
 create function private.proveedor_bloqueado_por_deuda_ugo(uuid) returns boolean language sql as $$select false$$;
 create function private.service_duration_minutes(jsonb) returns integer language sql as $$select 60$$;
 insert into usuarios values ('00000000-0000-0000-0000-000000000001','proveedor',true),('00000000-0000-0000-0000-000000000002','proveedor',true);
 insert into perfiles_proveedor select id,100,'verificado',true,true,now(),now(),10,now(),10 from usuarios;
 insert into categorias values ('00000000-0000-0000-0000-000000000003','Test');
 insert into servicios(id,cliente_id,categoria_id,descripcion,estado,metadata,tarifa,created_at,ubicacion_cliente) values ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000003','Trabajo','buscando','{}',100,now()-interval '6 minutes',10);
 set ugo.actor='00000000-0000-0000-0000-000000000001';`)
 await db.exec(acceptance);await db.exec(pool)
 await db.exec(`insert into servicios(id,cliente_id,categoria_id,descripcion,estado,metadata,tarifa,created_at,ubicacion_cliente,programado_para) values
 ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000003','Cancelado','cancelado','{}',100,now()-interval '6 minutes',10,null),
 ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000003','Vencido','buscando','{}',100,now()-interval '6 minutes',10,now()-interval '1 minute'),
 ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000003','Reciente','buscando','{}',100,now(),10,null);`)
 assert.equal((await db.query('select * from public.obtener_pedidos_pendientes_proveedor()')).rows.length,1)
 await assert.rejects(db.query("select public.tomar_pedido_pendiente('00000000-0000-0000-0000-000000000012')"),/no disponible/)

 assert.equal((await db.query("select (public.tomar_pedido_pendiente('00000000-0000-0000-0000-000000000010')).estado as estado")).rows[0].estado,'asignado')
 await db.exec("set ugo.actor='00000000-0000-0000-0000-000000000002'")
 assert.equal((await db.query('select * from public.obtener_pedidos_pendientes_proveedor()')).rows.length,0)
 await assert.rejects(db.query("select public.tomar_pedido_pendiente('00000000-0000-0000-0000-000000000010')"),/no disponible/)
 }finally{await db.close()}
})
