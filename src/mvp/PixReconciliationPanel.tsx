import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import'./admin-pix-reconciliation.css'

type PixRow={id:string;servicio_id:string;cliente_id:string;proveedor_id:string;monto_bruto:number;moneda:string;pix_txid:string|null;pix_informado_at:string|null;pix_conciliado_at?:string|null;estado:string;pix_conciliacion_nota:string|null}
type ServiceRow={id:string;numero:number|null;descripcion:string|null}
type UserRow={id:string;nombre:string|null}
type Props={embedded?:boolean}

const money=(value:number,currency='BRL')=>{try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(Number(value||0))}catch{return `R$ ${Number(value||0).toFixed(2)}`}}
const when=(value?:string|null)=>value?new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'

export function PixReconciliationPanel({embedded=true}:Props){
 const[rows,setRows]=useState<PixRow[]>([]),[recent,setRecent]=useState<PixRow[]>([]),[services,setServices]=useState<Record<string,ServiceRow>>({}),[users,setUsers]=useState<Record<string,UserRow>>({}),[refs,setRefs]=useState<Record<string,string>>({}),[notes,setNotes]=useState<Record<string,string>>({}),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[loadError,setLoadError]=useState(''),[loading,setLoading]=useState(true)
 const load=useCallback(async()=>{
  setLoadError('');setLoading(true)
  try{
   const db=supabase as any
   const[{data,error},{data:history,error:historyError}]=await Promise.all([
    db.from('pagos').select('id,servicio_id,cliente_id,proveedor_id,monto_bruto,moneda,pix_txid,pix_informado_at,pix_conciliado_at,estado,pix_conciliacion_nota').eq('ambiente','real').eq('metodo','pix_direto').not('pix_informado_at','is',null).eq('estado','pendiente').order('pix_informado_at',{ascending:true}),
    db.from('pagos').select('id,servicio_id,cliente_id,proveedor_id,monto_bruto,moneda,pix_txid,pix_informado_at,pix_conciliado_at,estado,pix_conciliacion_nota').eq('ambiente','real').eq('metodo','pix_direto').order('created_at',{ascending:false}).limit(50),
   ])
   if(error)throw error;if(historyError)throw historyError
   const list=(data||[])as PixRow[],historyList=(history||[])as PixRow[]
   setRows(list);setRecent(historyList)
   const serviceIds=[...new Set([...list,...historyList].map(r=>r.servicio_id).filter(Boolean))],userIds=[...new Set([...list,...historyList].flatMap(r=>[r.cliente_id,r.proveedor_id]).filter(Boolean))]
   const[{data:s,error:se},{data:u,error:ue}]=await Promise.all([
    serviceIds.length?db.from('servicios').select('id,numero,descripcion').in('id',serviceIds):Promise.resolve({data:[],error:null}),
    userIds.length?db.from('usuarios').select('id,nombre').in('id,userIds):Promise.resolve({data:[],error:null}),
   ])
   if(se)throw se;if(ue)throw ue
   setServices(Object.fromEntries(((s||[]) as ServiceRow[]).map(x=>[x.id,x])));setUsers(Object.fromEntries((u||[]) as UserRow[]).map(x=>[x.id,x])))
  }catch(e){setLoadError(e instanceof Error?e.message:'No se pudo cargar Pix.')}finally{setLoading(false)}
 },[])
 useEffect(()=>{void load();const ch=supabase.channel('admin-pix-reconciliation').on('postgres_changes',{event:'*',schema:'public',table:'pagos'},()=>void load()).subscribe();return()=>{void supabase.removeChannel(ch)}},[load])
 const count=rows.length,total=useMemo(()=>rows.reduce((n,r)=>n+Number(r.monto_bruto||0),0),[rows])
 const todayStart=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()},[])
 const reconciledToday=useMemo(()=>recent.filter(r=>r.pix_conciliado_at&&new Date(r.pix_conciliado_at).getTime()>=todayStart&&r.estado!=='pendiente'),[recent,todayStart])
 const reconciledTotal=useMemo(()=>reconciledToday.reduce((sum,r)=>sum+Number(r.monto_bruto||0),0),[reconciledToday])
 async function reconcile(row:PixRow,approve:boolean){
  const ref=(refs[row.id]||'').trim(),note=(notes[row.id]||'').trim()
  if(approve&&ref.length<6){setMessage('Ingresá una referencia/E2E bancaria real de al menos 6 caracteres.');return}
  if(!approve&&note.length<8){setMessage('Para rechazar el Pix explicá el motivo con al menos 8 caracteres.');return}
  const svc=services[row.servicio_id],action=approve?'CONCILIAR':'RECHAZAR',detail=approve?`Referencia: ${ref}`:`Motivo: ${note}`
  if(!window.confirm(`${action} Pix real de ${row.moneda||'BRL'} ${Number(row.monto_bruto||0).toFixed(2)} del servicio #${svc?.numero??row.servicio_id.slice(0,8)}?\n\n${detail}\n\nLa acción queda auditada.`))return
 setBusy(row.id);setMessage('')
 try{
  const{error}=await(supabase as any).rpc('conciliar_pix_direto',{p_pago_id:row.id,p_aprobar:approve,p_referencia:approve?ref:null,p_nota:note||null})
  if(error)throw error
  setMessage(approve?'Pix conciliado y protegido. El proveedor ya puede continuar el servicio.':'Pix rechazado y registrado. El cliente fue notificado.')
 setRefs(v=>({...v,[row.id]:''}));setNotes(v=>({...v,[row.id]:''}));await load()
 }catch(e){setMessage(e instanceof Error?e.message:'No se pudo conciliar Pix.')}finally{setBusy('')}
 }
 return <section className={`ugo-pix-admin ${embedded?'embedded':'standalone'}`}>
  <header className="ugo-pix-admin-head"><div><small>FINANZAS · PIX REAL</small><h3>Conciliación PIX directo</h3><p>Controlá sólo pagos reales informados. Cada aprobación exige referencia bancaria y queda auditada.</p></div><button type="button" onClick={()=>void load()} disabled={loading}>{loading?'Actualizando…':'↻ Actualizar'}</button></header>
  <div className="ugo-pix-admin-kpis"><article><small>PIX pendientes</small><strong>{count}</strong><span>{money(total)}</span></article><article><small>Conciliados hoy</small><strong>{reconciledToday.length}</strong><span>{money(reconciledTotal)}</span></article><article><small>Último reporte</small><strong>{recent[0]?when(recent[0].pix_informado_at):'—'}</strong><span>{recent[0]?.estado||'Sin movimientos'}</span></article></div>
  {loadError&&<div role="alert" className="ugo-pix-admin-error">No se pudo actualizar PIX: {loadError}<button type="button" onClick={()=>void load()}>Reintentar</button></div>}
  {message&&<div role="status" className="ugo-pix-admin-message">{message}</div>}
  {!loading&&!loadError&&rows.length===0?<div className="ugo-pix-admin-empty"><div>✓</div><strong>No hay PIX pendientes de conciliación</strong><p>Cuando un cliente informe un PIX directo real, aparecerá acá con servicio, partes y monto.</p><button type="button" onClick={()=>void load()}>↻ Actualizar</button></div>:<div className="ugo-pix-admin-list">{rows.map(row=>{const svc=services[row.servicio_id],client=users[row.cliente_id],provider=users[row.proveedor_id];return <article key={row.id}>
   <div className="ugo-pix-admin-rowhead"><div><small>SERVICIO #{svc?.numero??row.servicio_id.slice(0,8)}</small><strong>{money(row.monto_bruto,row.moneda||'BRL')}</strong><p>{svc?.descripcion||'Servicio UGO'}</p></div><span>AGUARDANDO</span></div>
   <div className="ugo-pix-admin-meta"><span>Cliente <b>{client?.nombre||row.cliente_id.slice(0,8)}</b></span><span>Proveedor <b>{provider?.nombre||row.proveedor_id.slice(0,8)}</b></span><span>TXID <b>{row.pix_txid||'—'}</b></span><span>Informado <b>{when(row.pix_informado_at)}</b></span></div>
   <div className="ugo-pix-admin-fields"><label>Referencia / E2E bancaria real<input value={refs[row.id]||''} onChange={e=>setRefs(v=>({...v,[row.id]:e.target.value}))} placeholder="E2E o ID de la transacción"/></label><label>Nota / motivo de rechazo<input value={notes[row.id]||''} onChange={e=>setNotes(v=>({...v,[row.id]:e.target.value}))} placeholder="Obligatorio para rechazar"/></label></div>
   <div className="ugo-pix-admin-actions"><button type="button" className="approve" disabled={Boolean(busy)} onClick={()=>void reconcile(row,true)}>{busy===row.id?'Procesando…':'Conciliar PIX'}</button><button type="button" className="reject" disabled={Boolean(busy)} onClick={()=>void reconcile(row,false)}>{busy===row.id?'Procesando…':'Rechazar'}</button></div>
  </article>})}</div>}
  <footer>La conciliación no mueve dinero por sí sola: valida el ingreso real y actualiza el estado financiero protegido del servicio.</footer>
 </section>
}
