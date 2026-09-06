import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import{money}from'./shared'

type Payment={id:string;servicio_id:string;monto_bruto:number;comision_ugo:number;ganancia_proveedor:number;moneda:string;estado:string;metodo?:string|null;created_at:string;liberado_at?:string|null;reembolsado_at?:string|null;ambiente:'real'|'demo'}
type Withdrawal={id:string;proveedor_id:string;monto:number;moneda:string;estado:string;created_at:string;transferencia_externa_id?:string|null;notas?:string|null;ambiente:'real'|'demo';proveedor?:{nombre:string}|null}

type Props={embedded?:boolean}

export function AdminFinancePanel({embedded=false}:Props){
 const[open,setOpen]=useState(embedded),[payments,setPayments]=useState<Payment[]>([]),[withdrawals,setWithdrawals]=useState<Withdrawal[]>([]),[refs,setRefs]=useState<Record<string,string>>({}),[busy,setBusy]=useState(''),[message,setMessage]=useState('')
 const load=useCallback(async()=>{
  const db=supabase as any
  const[{data:p,error:pe},{data:w,error:we}]=await Promise.all([
   db.from('pagos').select('id,servicio_id,monto_bruto,comision_ugo,ganancia_proveedor,moneda,estado,metodo,created_at,liberado_at,reembolsado_at,ambiente').order('created_at',{ascending:false}).limit(500),
   db.from('retiros').select('id,proveedor_id,monto,moneda,estado,created_at,transferencia_externa_id,notas,ambiente,proveedor:usuarios!retiros_proveedor_id_fkey(nombre)').order('created_at',{ascending:false}).limit(500),
  ])
  if(pe)throw pe;if(we)throw we
  setPayments((p||[])as Payment[]);setWithdrawals((w||[])as Withdrawal[])
 },[])
 useEffect(()=>{if(!open&&!embedded)return;load().catch(e=>setMessage(e.message));const ch=supabase.channel('admin-finance-live').on('postgres_changes',{event:'*',schema:'public',table:'pagos'},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'retiros'},()=>load()).subscribe();return()=>{supabase.removeChannel(ch)}},[open,embedded,load])
 const realPayments=useMemo(()=>payments.filter(p=>p.ambiente==='real'),[payments])
 const demoPayments=useMemo(()=>payments.filter(p=>p.ambiente==='demo'),[payments])
 const realWithdrawals=useMemo(()=>withdrawals.filter(w=>w.ambiente==='real'),[withdrawals])
 const pending=useMemo(()=>realWithdrawals.filter(w=>['pendiente','procesando'].includes(w.estado)),[realWithdrawals])
 const totals=useMemo(()=>{
  const valid=realPayments.filter(p=>p.estado!=='reembolsado'&&!p.reembolsado_at)
  const gmv=valid.reduce((a,p)=>a+Number(p.monto_bruto||0),0)
  const retained=valid.filter(p=>p.estado==='retenido').reduce((a,p)=>a+Number(p.monto_bruto||0),0)
  const releasedProvider=valid.filter(p=>p.estado==='liberado').reduce((a,p)=>a+Number(p.ganancia_proveedor||0),0)
  const fees=valid.filter(p=>p.estado==='liberado').reduce((a,p)=>a+Number(p.comision_ugo||0),0)
  const refunded=realPayments.filter(p=>p.estado==='reembolsado'||!!p.reembolsado_at).reduce((a,p)=>a+Number(p.monto_bruto||0),0)
  const withdrawn=realWithdrawals.filter(w=>w.estado==='pagado').reduce((a,w)=>a+Number(w.monto||0),0)
  const withdrawalPending=pending.reduce((a,w)=>a+Number(w.monto||0),0)
  return{gmv,retained,releasedProvider,fees,refunded,withdrawn,withdrawalPending,providerBalance:Math.max(0,releasedProvider-withdrawn)}
 },[realPayments,realWithdrawals,pending])
 async function act(row:Withdrawal,state:'procesando'|'pagado'|'fallido'){
  if(row.ambiente!=='real')return setMessage('Los retiros DEMO no pueden procesarse como dinero real.')
  const ref=(refs[row.id]||'').trim();if(state==='pagado'&&!ref)return setMessage('Ingresá la referencia real de la transferencia antes de marcar Pagado.')
  setBusy(row.id+state);setMessage('')
  const{error}=await (supabase as any).rpc('admin_actualizar_retiro',{p_retiro_id:row.id,p_estado:state,p_transferencia_externa_id:ref||null,p_notas:state==='fallido'?'Marcado fallido desde Admin UGO':null})
  setBusy('');if(error)return setMessage(error.message)
  setMessage(state==='pagado'?'Retiro REAL marcado como pagado con referencia externa.':'Retiro actualizado.');await load()
 }
 const body=<div style={{background:'#fff',border:embedded?'0':'1px solid #ddd',borderRadius:22,padding:16,color:'#111'}}>
   <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1}}><strong>Finanzas UGO · REAL</strong><div style={{fontSize:11,opacity:.6}}>DEMO excluido automáticamente de todos los totales comerciales</div></div>{!embedded&&<button onClick={()=>setOpen(false)} style={{border:0,background:'transparent',fontSize:22,cursor:'pointer'}}>×</button>}</div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8,marginTop:12}}>
    {[['GMV REAL',totals.gmv],['RETENIDO',totals.retained],['SALDO PROV.',totals.providerBalance],['COMISIÓN UGO',totals.fees],['RETIRADO',totals.withdrawn],['REEMBOLSADO',totals.refunded]].map(([label,value])=><div key={String(label)} style={{padding:11,borderRadius:14,background:'#f6f7f8'}}><small>{label}</small><b style={{display:'block',marginTop:3}}>{money(Number(value))}</b></div>)}
   </div>
   <div style={{marginTop:10,padding:10,borderRadius:12,background:'#fff8df',fontSize:12}}><b>DEMO separado:</b> {demoPayments.length} pagos · {money(demoPayments.reduce((a,p)=>a+Number(p.monto_bruto||0),0))} fuera de GMV y comisión.</div>
   <h3 style={{fontSize:13,margin:'16px 0 8px'}}>Retiros REAL por procesar ({pending.length}) · {money(totals.withdrawalPending)}</h3>
   {pending.length===0&&<div style={{padding:16,textAlign:'center',fontSize:12,opacity:.6}}>No hay retiros reales pendientes.</div>}
   {pending.map(w=><div key={w.id} style={{border:'1px solid #e5e7eb',borderRadius:14,padding:11,marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><div><b>{w.proveedor?.nombre||'Proveedor UGO'}</b><small style={{display:'block',opacity:.6}}>{new Date(w.created_at).toLocaleString('pt-BR')} · {w.estado} · REAL</small></div><strong>{money(w.monto,w.moneda)}</strong></div><input value={refs[w.id]||''} onChange={e=>setRefs(v=>({...v,[w.id]:e.target.value}))} placeholder="Referencia externa / E2E / ID transferencia" style={{width:'100%',marginTop:8,padding:9,border:'1px solid #d0d5dd',borderRadius:10}}/><div style={{display:'flex',gap:6,marginTop:8}}><button disabled={!!busy||w.estado==='procesando'} onClick={()=>act(w,'procesando')} style={{flex:1,padding:8,borderRadius:10,border:'1px solid #ddd',background:'#fff'}}>Procesar</button><button disabled={!!busy} onClick={()=>act(w,'pagado')} style={{flex:1,padding:8,borderRadius:10,border:0,background:'#111820',color:'#fff',fontWeight:800}}>Pagado</button><button disabled={!!busy} onClick={()=>act(w,'fallido')} style={{padding:8,borderRadius:10,border:'1px solid #f0b4b4',background:'#fff'}}>Fallido</button></div></div>)}
   {message&&<div style={{fontSize:12,padding:'8px 0'}}>{message}</div>}
   <p style={{fontSize:10,opacity:.6,lineHeight:1.4,marginTop:10}}>GMV, comisión, saldo, retiros y reembolsos usan únicamente registros con ambiente REAL. “Liberado” es un estado interno; “Pagado” requiere referencia externa.</p>
  </div>
 if(embedded)return body
 return <><button type="button" onClick={()=>setOpen(v=>!v)} style={{position:'fixed',left:18,bottom:18,zIndex:14020,border:0,borderRadius:999,padding:'11px 15px',fontWeight:900,background:'#111820',color:'#fff',boxShadow:'0 8px 28px rgba(0,0,0,.24)',cursor:'pointer'}}>💰 Finanzas</button>{open&&<aside style={{position:'fixed',left:18,bottom:66,zIndex:14019,width:'min(620px,calc(100vw - 36px))',maxHeight:'min(760px,calc(100vh - 90px))',overflow:'auto',background:'#fff',borderRadius:22,boxShadow:'0 18px 60px rgba(0,0,0,.3)'}}>{body}</aside>}</>
}
