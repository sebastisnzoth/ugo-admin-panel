import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{supabase as adminSupabase}from'../lib/supabase'

type Role='client'|'provider'|'admin'
type Person={nombre?:string|null;apellido?:string|null}
type Row={id:string;estado:string;descripcion?:string|null;tarifa?:number|string|null;created_at?:string|null;updated_at?:string|null;cliente_id?:string|null;proveedor_id?:string|null;categoria?:{nombre?:string|null;emoji?:string|null}|null;cliente?:Person|null;proveedor?:Person|null}

const LABELS:Record<string,string>={buscando:'Buscando proveedor',ofrecido:'Oferta enviada',asignado:'Asignado',en_camino:'En camino',llegado:'Proveedor llegó',en_progreso:'En curso',esperando_aprobacion:'Esperando aprobación',completado:'Completado',cancelado:'Cancelado',disputado:'En disputa'}
const money=(v:unknown)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const person=(p?:Person|null)=>[p?.nombre,p?.apellido].filter(Boolean).join(' ')||'—'
const date=(v?:string|null)=>v?new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—'

export function ServiceHistoryPanel({role}:{role:Role}){
 const sb=useMemo(()=>role==='admin'?adminSupabase:getRoleSupabase(role),[role])
 const[userId,setUserId]=useState<string|null>(null),[open,setOpen]=useState(false),[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[filter,setFilter]=useState<'todos'|'completado'|'activo'>('todos')
 useEffect(()=>{let alive=true;sb.auth.getSession().then(({data})=>{if(alive)setUserId(data.session?.user?.id||null)});const{data:l}=sb.auth.onAuthStateChange((_e,s)=>setUserId(s?.user?.id||null));return()=>{alive=false;l.subscription.unsubscribe()}},[sb])
 const load=useCallback(async()=>{if(!userId)return;setLoading(true);setError('');try{let q=(sb as any).from('servicios').select('id,estado,descripcion,tarifa,created_at,updated_at,cliente_id,proveedor_id,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre,apellido),proveedor:usuarios!servicios_proveedor_id_fkey(nombre,apellido)').order('created_at',{ascending:false}).limit(role==='admin'?200:80);if(role==='client')q=q.eq('cliente_id',userId);if(role==='provider')q=q.eq('proveedor_id',userId);const{data,error}=await q;if(error)throw error;setRows((data||[]) as Row[])}catch(e:any){setError(e?.message||'No se pudo cargar el historial.')}finally{setLoading(false)}},[role,sb,userId])
 useEffect(()=>{if(open)load()},[open,load])
 useEffect(()=>{if(!userId)return;const ch=(sb as any).channel(`ugo-history-${role}-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios'},()=>{if(open)load()}).subscribe();return()=>{sb.removeChannel(ch)}},[load,open,role,sb,userId])
 if(!userId)return null
 const activeStates=new Set(['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion'])
 const visible=rows.filter(r=>filter==='todos'||filter==='completado'?(filter==='todos'||r.estado==='completado'):activeStates.has(r.estado))
 const title=role==='client'?'Mis servicios':role==='provider'?'Mis trabajos':'Historial global'
 return <>
  <button type="button" className={`ugo-history-launch ugo-history-${role}`} onClick={()=>setOpen(true)}>📚 <span>{role==='provider'?'Trabajos':'Historial'}</span></button>
  {open&&<div className="ugo-history-backdrop" onClick={()=>setOpen(false)}><section className="ugo-history-panel" onClick={e=>e.stopPropagation()}>
   <header><div><small>{role==='admin'?'CONTROL UGO':role==='provider'?'PROVEEDOR':'CLIENTE'}</small><h2>{title}</h2><p>{role==='admin'?'Todos los pedidos y trabajos de UGO.':role==='provider'?'Trabajos aceptados y realizados por vos.':'Pedidos activos y servicios ya realizados.'}</p></div><button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar">×</button></header>
   <div className="ugo-history-filters"><button className={filter==='todos'?'active':''} onClick={()=>setFilter('todos')}>Todos <b>{rows.length}</b></button><button className={filter==='activo'?'active':''} onClick={()=>setFilter('activo')}>Activos <b>{rows.filter(r=>activeStates.has(r.estado)).length}</b></button><button className={filter==='completado'?'active':''} onClick={()=>setFilter('completado')}>Completados <b>{rows.filter(r=>r.estado==='completado').length}</b></button><button onClick={load} disabled={loading}>↻</button></div>
   <div className="ugo-history-list">{loading&&<div className="ugo-history-empty">Cargando historial…</div>}{error&&<div className="ugo-history-error">{error}</div>}{!loading&&!error&&visible.length===0&&<div className="ugo-history-empty">Todavía no hay servicios en esta sección.</div>}{!loading&&!error&&visible.map(r=><article key={r.id}>
    <div className="ugo-history-top"><div><small>SERVICIO</small><strong>#{r.id}</strong></div><span className={`state-${r.estado}`}>{LABELS[r.estado]||r.estado}</span></div>
    <h3>{r.categoria?.emoji||'🧰'} {r.categoria?.nombre||'Servicio UGO'}</h3>
    {r.descripcion&&<p>{r.descripcion}</p>}
    <div className="ugo-history-meta"><div><small>FECHA</small><b>{date(r.created_at)}</b></div><div><small>IMPORTE</small><b>{money(r.tarifa)}</b></div>{role!=='client'&&<div><small>CLIENTE</small><b>{person(r.cliente)}</b></div>}{role!=='provider'&&<div><small>PROVEEDOR</small><b>{person(r.proveedor)}</b></div>}</div>
   </article>)}</div>
  </section></div>}
 </>
}
