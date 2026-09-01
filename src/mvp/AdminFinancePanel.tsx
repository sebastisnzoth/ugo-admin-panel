import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import{money}from'./shared'

type Payment={id:string;servicio_id:string;monto_bruto:number;comision_ugo:number;ganancia_proveedor:number;moneda:string;estado:string;metodo?:string|null;created_at:string;liberado_at?:string|null}
type Withdrawal={id:string;proveedor_id:string;monto:number;moneda:string;estado:string;created_at:string;transferencia_externa_id?:string|null;notas?:string|null;proveedor?:{nombre:string}|null}

export function AdminFinancePanel(){
 const[open,setOpen]=useState(false),[payments,setPayments]=useState<Payment[]>([]),[withdrawals,setWithdrawals]=useState<Withdrawal[]>([]),[refs,setRefs]=useState<Record<string,string>>({}),[busy,setBusy]=useState(''),[message,setMessage]=useState('')
 const load=useCallback(async()=>{
  const[{data:p,error:pe},{data:w,error:we}]=await Promise.all([
   supabase.from('pagos').select('id,servicio_id,monto_bruto,comision_ugo,ganancia_proveedor,moneda,estado,metodo,created_at,liberado_at').order('created_at',{ascending:false}).limit(100),
   supabase.from('retiros').select('id,proveedor_id,monto,moneda,estado,created_at,transferencia_externa_id,notas,proveedor:usuarios!retiros_proveedor_id_fkey(nombre)').in('estado',['pendiente','procesando']).order('created_at',{ascending:true}).limit(50),
  ]);if(pe)throw pe;if(we)throw we;setPayments((p||[])as Payment[]);setWithdrawals((w||[])as Withdrawal[])
 },[])
 useEffect(()=>{if(!open)return;load().catch(e=>setMessage(e.message));const ch=supabase.channel('admin-finance-live').on('postgres_changes',{event:'*',schema:'public',table:'pagos'},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'retiros'},()=>load()).subscribe();return()=>{supabase.removeChannel(ch)}},[open,load])
 const totals=useMemo(()=>payments.reduce((a,p)=>{if(p.estado==='retenido')a.retained+=Number(p.monto_bruto||0);if(p.estado==='liberado'){a.released+=Number(p.ganancia_proveedor||0);a.fees+=Number(p.comision_ugo||0)}return a},{retained:0,released:0,fees:0}),[payments])
 async function act(row:Withdrawal,state:'procesando'|'pagado'|'fallido'){
  const ref=(refs[row.id]||'').trim();if(state==='pagado'&&!ref)return setMessage('Ingresá la referencia real de la transferencia antes de marcar Pagado.');setBusy(row.id+state);setMessage('');const{error}=await (supabase as any).rpc('admin_actualizar_retiro',{p_retiro_id:row.id,p_estado:state,p_transferencia_externa_id:ref||null,p_notas:state==='fallido'?'Marcado fallido desde Admin UGO':null});setBusy('');if(error)return setMessage(error.message);setMessage(state==='pagado'?'Retiro marcado como pagado con referencia externa.':'Retiro actualizado.');await load()
 }
 return <>
  <button type="button" onClick={()=>setOpen(v=>!v)} style={{position:'fixed',left:18,bottom:18,zIndex:14020,border:0,borderRadius:999,padding:'11px 15px',fontWeight:900,background:'#111820',color:'#fff',boxShadow:'0 8px 28px rgba(0,0,0,.24)',cursor:'pointer'}}>💰 Finanzas</button>
  {open&&<aside style={{position:'fixed',left:18,bottom:66,zIndex:14019,width:'min(520px,calc(100vw - 36px))',maxHeight:'min(680px,calc(100vh - 90px))',overflow:'auto',background:'#fff',border:'1px solid #ddd',borderRadius:22,boxShadow:'0 18px 60px rgba(0,0,0,.3)',padding:16,color:'#111'}}>
   <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1}}><strong>Finanzas UGO</strong><div style={{fontSize:11,opacity:.6}}>Pagos y retiros reales</div></div><button onClick={()=>setOpen(false)} style={{border:0,background:'transparent',fontSize:22,cursor:'pointer'}}>×</button></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:12}}><div style={{padding:11,borderRadius:14,background:'#f6f7f8'}}><small>RETENIDO</small><b style={{display:'block',marginTop:3}}>{money(totals.retained)}</b></div><div style={{padding:11,borderRadius:14,background:'#f6f7f8'}}><small>LIBERADO PROV.</small><b style={{display:'block',marginTop:3}}>{money(totals.released)}</b></div><div style={{padding:11,borderRadius:14,background:'#f6f7f8'}}><small>COMISIÓN UGO</small><b style={{display:'block',marginTop:3}}>{money(totals.fees)}</b></div></div>
   <h3 style={{fontSize:13,margin:'16px 0 8px'}}>Retiros por procesar ({withdrawals.length})</h3>
   {withdrawals.length===0&&<div style={{padding:16,textAlign:'center',fontSize:12,opacity:.6}}>No hay retiros pendientes.</div>}
   {withdrawals.map(w=><div key={w.id} style={{border:'1px solid #e5e7eb',borderRadius:14,padding:11,marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><div><b>{w.proveedor?.nombre||'Proveedor UGO'}</b><small style={{display:'block',opacity:.6}}>{new Date(w.created_at).toLocaleString('pt-BR')} · {w.estado}</small></div><strong>{money(w.monto,w.moneda)}</strong></div><input value={refs[w.id]||''} onChange={e=>setRefs(v=>({...v,[w.id]:e.target.value}))} placeholder="Referencia externa / E2E / ID transferencia" style={{width:'100%',marginTop:8,padding:9,border:'1px solid #d0d5dd',borderRadius:10}}/><div style={{display:'flex',gap:6,marginTop:8}}><button disabled={!!busy||w.estado==='procesando'} onClick={()=>act(w,'procesando')} style={{flex:1,padding:8,borderRadius:10,border:'1px solid #ddd',background:'#fff'}}>Procesar</button><button disabled={!!busy} onClick={()=>act(w,'pagado')} style={{flex:1,padding:8,borderRadius:10,border:0,background:'#111820',color:'#fff',fontWeight:800}}>Pagado</button><button disabled={!!busy} onClick={()=>act(w,'fallido')} style={{padding:8,borderRadius:10,border:'1px solid #f0b4b4',background:'#fff'}}>Fallido</button></div></div>)}
   {message&&<div style={{fontSize:12,padding:'8px 0'}}>{message}</div>}
   <p style={{fontSize:10,opacity:.6,lineHeight:1.4,marginTop:10}}>“Liberado” es estado interno de UGO. Un retiro solo se marca “Pagado” cuando el Admin registra una referencia externa real.</p>
  </aside>}
 </>
}
