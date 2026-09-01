import React,{useCallback,useEffect,useState}from'react'
import{supabase}from'../lib/supabase'
import{money}from'./shared'

type Props={onFindAnother?:()=>void}
type CompletedService={id:string;numero:number;descripcion:string;completado_at?:string|null;categoria?:{nombre:string;emoji:string}|null;cliente?:{nombre:string}|null}
type ReleasedPayment={id:string;servicio_id:string;monto_bruto:number;comision_ugo:number;ganancia_proveedor:number;moneda:string;estado:string;metodo?:string|null;mp_payment_id?:string|null;pix_e2e_id?:string|null;liberado_at?:string|null;created_at:string;servicio?:CompletedService|null}

export function ProviderCompletionReceipt({onFindAnother}:Props){
 const[uid,setUid]=useState(''),[payment,setPayment]=useState<ReleasedPayment|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false)
 const db=supabase as any
 const load=useCallback(async(userId:string)=>{
  const{data,error}=await db.from('pagos').select('id,servicio_id,monto_bruto,comision_ugo,ganancia_proveedor,moneda,estado,metodo,mp_payment_id,pix_e2e_id,liberado_at,created_at,servicio:servicios!pagos_servicio_id_fkey(id,numero,descripcion,completado_at,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre))').eq('proveedor_id',userId).eq('estado','liberado').order('liberado_at',{ascending:false}).limit(1).maybeSingle()
  if(error)return
  const row=(data as ReleasedPayment|null)||null
  setPayment(row)
  if(!row)return setOpen(false)
  const dismissed=localStorage.getItem(`ugo:provider-completion-dismissed:${userId}`)
  if(dismissed!==row.id)setOpen(true)
 },[db])
 useEffect(()=>{let alive=true;let channel:any=null;supabase.auth.getUser().then(({data})=>{if(!alive||!data.user)return;const id=data.user.id;setUid(id);load(id);channel=supabase.channel(`provider-completion-${id}`).on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`proveedor_id=eq.${id}`},()=>load(id)).subscribe()});return()=>{alive=false;if(channel)supabase.removeChannel(channel)}},[load])
 if(!open||!payment)return null
 const service=payment.servicio,ref=payment.pix_e2e_id||payment.mp_payment_id||payment.id,method=payment.metodo==='pix_direto'?'Pix direto UGO':payment.metodo==='pix'?'Pix':payment.metodo==='mercadopago'?'Mercado Pago':payment.metodo||'Pago UGO'
 async function another(){if(!uid)return;setBusy(true);await db.from('perfiles_proveedor').update({online:true,disponible:true}).eq('usuario_id',uid);localStorage.setItem(`ugo:provider-completion-dismissed:${uid}`,payment.id);setBusy(false);setOpen(false);onFindAnother?.()}
 function close(){if(uid)localStorage.setItem(`ugo:provider-completion-dismissed:${uid}`,payment.id);setOpen(false)}
 return <div style={{position:'fixed',inset:0,zIndex:13050,background:'rgba(5,10,14,.72)',backdropFilter:'blur(8px)',display:'grid',placeItems:'center',padding:18}}>
  <section style={{width:'min(430px,100%)',background:'#fff',borderRadius:28,padding:22,boxShadow:'0 24px 80px rgba(0,0,0,.35)',color:'#101418'}}>
   <div style={{width:58,height:58,borderRadius:999,display:'grid',placeItems:'center',margin:'0 auto 10px',background:'#eaf9ef',fontSize:30}}>✓</div>
   <div style={{textAlign:'center'}}><small style={{fontWeight:900,letterSpacing:1,color:'#258a49'}}>PAGO LIBERADO EN UGO</small><h2 style={{margin:'6px 0 4px'}}>Trabajo aprobado</h2><p style={{margin:0,color:'#657079',fontSize:13}}>El cliente aprobó el servicio #{service?.numero||''}. Tu ganancia ya está disponible en el saldo UGO.</p></div>
   <div style={{margin:'18px 0',padding:16,borderRadius:20,background:'#f7f9fa'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:10}}><span style={{color:'#657079'}}>Servicio</span><b>{service?.categoria?.emoji} {service?.categoria?.nombre||`#${service?.numero||''}`}</b></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:10}}><span style={{color:'#657079'}}>Cliente</span><b>{service?.cliente?.nombre||'Cliente UGO'}</b></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:10}}><span style={{color:'#657079'}}>Total</span><b>{money(payment.monto_bruto,payment.moneda)}</b></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:10}}><span style={{color:'#657079'}}>Comisión UGO</span><b>- {money(payment.comision_ugo,payment.moneda)}</b></div>
    <div style={{height:1,background:'#dde2e5',margin:'12px 0'}}/>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'end'}}><span style={{fontWeight:800}}>Ganaste</span><strong style={{fontSize:27}}>{money(payment.ganancia_proveedor,payment.moneda)}</strong></div>
   </div>
   <details style={{fontSize:12,marginBottom:16}}><summary style={{cursor:'pointer',fontWeight:800}}>Comprobante UGO</summary><div style={{padding:'10px 2px 0',lineHeight:1.65,color:'#59636b'}}>Método: {method}<br/>Referencia: <span style={{wordBreak:'break-all'}}>{ref}</span><br/>Liberado: {new Date(payment.liberado_at||payment.created_at).toLocaleString('pt-BR')}<br/>Pago UGO: {payment.id}</div></details>
   <button type="button" onClick={another} disabled={busy} style={{width:'100%',border:0,borderRadius:16,padding:'14px 16px',background:'#111820',color:'#fff',fontWeight:900,fontSize:15,cursor:'pointer'}}>{busy?'Activando radar…':'Buscar otro trabajo'}</button>
   <button type="button" onClick={close} style={{width:'100%',border:0,background:'transparent',padding:'11px',fontWeight:700,color:'#657079',cursor:'pointer'}}>Ver más tarde</button>
  </section>
 </div>
}
