import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'

type PixRow={id:string;servicio_id:string;cliente_id:string;proveedor_id:string;monto_bruto:number;moneda:string;pix_txid:string|null;pix_informado_at:string|null;estado:string;pix_conciliacion_nota:string|null}
type ServiceRow={id:string;numero:number|null;descripcion:string|null}
type UserRow={id:string;nombre:string|null}

export function PixReconciliationPanel(){
 const[open,setOpen]=useState(false),[rows,setRows]=useState<PixRow[]>([]),[services,setServices]=useState<Record<string,ServiceRow>>({}),[users,setUsers]=useState<Record<string,UserRow>>({}),[refs,setRefs]=useState<Record<string,string>>({}),[notes,setNotes]=useState<Record<string,string>>({}),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[loadError,setLoadError]=useState('')
 const load=useCallback(async()=>{
  setLoadError('')
  const{data,error}=await(supabase as any).from('pagos').select('id,servicio_id,cliente_id,proveedor_id,monto_bruto,moneda,pix_txid,pix_informado_at,estado,pix_conciliacion_nota').eq('ambiente','real').eq('metodo','pix_direto').not('pix_informado_at','is',null).eq('estado','pendiente').order('pix_informado_at',{ascending:true})
  if(error)throw error
  const list=(data||[])as PixRow[];setRows(list)
  const serviceIds=[...new Set(list.map(r=>r.servicio_id))],userIds=[...new Set(list.flatMap(r=>[r.cliente_id,r.proveedor_id]).filter(Boolean))]
  const[{data:s,error:se},{data:u,error:ue}]=await Promise.all([
   serviceIds.length?(supabase as any).from('servicios').select('id,numero,descripcion').in('id',serviceIds):Promise.resolve({data:[],error:null}),
   userIds.length?(supabase as any).from('usuarios').select('id,nombre').in('id',userIds):Promise.resolve({data:[],error:null}),
  ])
  if(se)throw se;if(ue)throw ue
  setServices(Object.fromEntries(((s||[])as ServiceRow[]).map(x=>[x.id,x])));setUsers(Object.fromEntries(((u||[])as UserRow[]).map(x=>[x.id,x])))
 },[])
 useEffect(()=>{load().catch(e=>setLoadError(e instanceof Error?e.message:'No se pudo cargar Pix.'));const ch=supabase.channel('admin-pix-reconciliation').on('postgres_changes',{event:'*',schema:'public',table:'pagos'},()=>load().catch(e=>setLoadError(e instanceof Error?e.message:'No se pudo actualizar Pix.'))).subscribe();return()=>{supabase.removeChannel(ch)}},[load])
 const count=rows.length,total=useMemo(()=>rows.reduce((n,r)=>n+Number(r.monto_bruto||0),0),[rows])
 async function reconcile(row:PixRow,approve:boolean){
  const ref=(refs[row.id]||'').trim(),note=(notes[row.id]||'').trim()
  if(approve&&ref.length<6){setMessage('Ingresá una referencia/E2E bancaria real de al menos 6 caracteres.');return}
  if(!approve&&note.length<8){setMessage('Para rechazar el Pix explicá el motivo con al menos 8 caracteres.');return}
  const svc=services[row.servicio_id]
  const action=approve?'CONCILIAR':'RECHAZAR'
  const detail=approve?`Referencia: ${ref}`:`Motivo: ${note}`
  if(!window.confirm(`${action} Pix real de ${row.moneda||'BRL'} ${Number(row.monto_bruto||0).toFixed(2)} del servicio #${svc?.numero??row.servicio_id.slice(0,8)}?\n\n${detail}\n\nLa acción queda auditada.`))return
  setBusy(row.id);setMessage('')
  try{
   const{error}=await(supabase as any).rpc('conciliar_pix_direto',{p_pago_id:row.id,p_aprobar:approve,p_referencia:approve?ref:null,p_nota:note||null})
   if(error)throw error
   setMessage(approve?'Pix conciliado y protegido. El proveedor ya puede continuar el servicio.':'Pix rechazado y registrado. El cliente fue notificado.')
   setRefs(v=>({...v,[row.id]:''}));setNotes(v=>({...v,[row.id]:''}))
   await load()
  }catch(e){setMessage(e instanceof Error?e.message:'No se pudo conciliar Pix.')}finally{setBusy('')}
 }
 return <>
  <button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="ugo-admin-pix-panel" style={{position:'fixed',right:18,top:62,zIndex:10020,border:0,borderRadius:18,padding:'9px 13px',fontWeight:900,background:'#fff',boxShadow:'0 4px 18px rgba(0,0,0,.18)',cursor:'pointer'}}>PIX {count>0?`· ${count}`:''}</button>
  {open&&<aside id="ugo-admin-pix-panel" style={{position:'fixed',right:12,top:106,bottom:12,zIndex:10019,width:'min(440px,calc(100vw - 24px))',background:'#f5f6f7',border:'1px solid rgba(0,0,0,.12)',borderRadius:20,boxShadow:'0 20px 60px rgba(0,0,0,.25)',padding:16,overflowY:'auto'}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><small style={{fontWeight:800}}>CONCILIAÇÃO PIX DIRETO</small><h2 style={{margin:'4px 0'}}>R$ {total.toFixed(2)} pendentes</h2></div><button aria-label="Fechar conciliação Pix" onClick={()=>setOpen(false)} style={{border:0,borderRadius:99,width:32,height:32}}>×</button></div>
   <p style={{fontSize:12,opacity:.7}}>Só aprove depois de localizar o Pix na conta UGO. A referência/E2E é obrigatória e cada decisão fica registrada no audit log.</p>
   {loadError&&<div role="alert" style={{margin:'10px 0',padding:10,borderRadius:12,background:'#fff1f0',fontSize:12,color:'#b42318'}}>Falha ao carregar: {loadError} <button onClick={()=>void load().catch(e=>setLoadError(e instanceof Error?e.message:'No se pudo cargar Pix.'))}>Tentar novamente</button></div>}
   {message&&<div role="status" style={{margin:'10px 0',padding:10,borderRadius:12,background:'#fff',fontSize:12}}>{message}</div>}
   {!loadError&&rows.length===0?<div style={{marginTop:18,padding:18,borderRadius:16,background:'#fff'}}>Nenhum Pix direto aguardando conciliação.</div>:rows.map(row=>{const svc=services[row.servicio_id],client=users[row.cliente_id],provider=users[row.proveedor_id];return <div key={row.id} style={{marginTop:12,padding:14,borderRadius:16,background:'#fff',border:'1px solid rgba(0,0,0,.08)'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10}}><div><small>Serviço #{svc?.numero??row.servicio_id.slice(0,8)}</small><strong style={{display:'block',fontSize:17,marginTop:2}}>{row.moneda||'BRL'} {Number(row.monto_bruto||0).toFixed(2)}</strong></div><span style={{fontSize:11,fontWeight:800}}>AGUARDANDO</span></div>
    <p style={{fontSize:12,margin:'8px 0'}}>{svc?.descripcion||'Serviço UGO'}</p><div style={{fontSize:11,opacity:.7}}>Cliente: {client?.nombre||row.cliente_id.slice(0,8)} · Provedor: {provider?.nombre||row.proveedor_id.slice(0,8)}</div><div style={{fontSize:11,opacity:.7,marginTop:3}}>TXID: {row.pix_txid||'—'} · Informado: {row.pix_informado_at?new Date(row.pix_informado_at).toLocaleString('pt-BR'):'—'}</div>
    <label style={{display:'block',fontSize:11,fontWeight:800,marginTop:10}}>Referência / E2E<input value={refs[row.id]||''} onChange={e=>setRefs(v=>({...v,[row.id]:e.target.value}))} placeholder="E2E ou ID real da transação" style={{display:'block',width:'100%',marginTop:4,padding:9,border:'1px solid #ddd',borderRadius:10}}/></label>
    <label style={{display:'block',fontSize:11,fontWeight:800,marginTop:8}}>Nota / motivo de rejeição<input value={notes[row.id]||''} onChange={e=>setNotes(v=>({...v,[row.id]:e.target.value}))} placeholder="Obrigatório para rejeitar" style={{display:'block',width:'100%',marginTop:4,padding:9,border:'1px solid #ddd',borderRadius:10}}/></label>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10}}><button disabled={Boolean(busy)} onClick={()=>void reconcile(row,true)} style={{border:0,borderRadius:12,padding:10,fontWeight:900,background:'#05944F',color:'#fff'}}>{busy===row.id?'Processando…':'Conciliar'}</button><button disabled={Boolean(busy)} onClick={()=>void reconcile(row,false)} style={{border:'1px solid #ddd',borderRadius:12,padding:10,fontWeight:900,background:'#fff'}}>{busy===row.id?'Processando…':'Rejeitar'}</button></div>
   </div>})}
  </aside>}
 </>
}
