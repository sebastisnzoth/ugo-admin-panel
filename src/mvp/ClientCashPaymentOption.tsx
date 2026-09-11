import React,{useCallback,useEffect,useState}from'react'
import{useRoleSession,type Service}from'./shared'

type CashPayment={id:string;servicio_id:string;metodo?:string|null;estado:string;monto_bruto:number;moneda:string}

export function ClientCashPaymentOption(){
 const auth=useRoleSession('client'),{supabase,session}=auth
 const[service,setService]=useState<Service|null>(null),[payment,setPayment]=useState<CashPayment|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const load=useCallback(async()=>{if(!session)return;const{data:rows}=await supabase.from('servicios').select('*').eq('cliente_id',session.user.id).in('estado',['asignado','pago_pendiente','en_camino','llegado','en_progreso','esperando_aprobacion']).order('created_at',{ascending:false}).limit(1);const current=((rows||[])[0]as Service|undefined)||null;setService(current);if(!current){setPayment(null);return}const{data:p}=await supabase.from('pagos').select('id,servicio_id,metodo,estado,monto_bruto,moneda').eq('servicio_id',current.id).maybeSingle();setPayment((p as CashPayment|null)||null)},[session,supabase])
 useEffect(()=>{load().catch(()=>{})},[load])
 useEffect(()=>{if(!session)return;const ch=supabase.channel(`client-cash-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'pagos'},load).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`cliente_id=eq.${session.user.id}`},load).subscribe();return()=>{supabase.removeChannel(ch)}},[load,session,supabase])
 if(!session||!service)return null
 if(payment&&payment.metodo!=='efectivo')return null
 const selected=payment?.metodo==='efectivo'
 async function chooseCash(){setBusy(true);setMessage('');try{const{error}=await supabase.rpc('seleccionar_pago_efectivo',{p_servicio_id:service.id});if(error)throw error;setMessage('Efectivo seleccionado. UGO registra el cobro, pero no custodia el dinero. El profesional confirmará la recepción al finalizar.');await load()}catch(e){setMessage(e instanceof Error?e.message:'No se pudo elegir efectivo.')}finally{setBusy(false)}}
 return <aside style={{position:'fixed',right:16,bottom:96,zIndex:35,width:'min(340px,calc(100vw - 32px))',background:'#fff',border:'1px solid rgba(23,33,27,.12)',borderRadius:18,padding:16,boxShadow:'0 14px 40px rgba(23,33,27,.14)'}} aria-label="Pago en efectivo"><small style={{fontWeight:900,letterSpacing:'.08em',color:'#128c4a'}}>FORMA DE PAGO</small><h3 style={{margin:'6px 0'}}>💵 Efectivo</h3>{selected?<p style={{margin:'0 0 8px',fontSize:14}}>Seleccionado. Este método <b>no tiene custodia electrónica de UGO</b>. El profesional confirmará la recepción al finalizar.</p>:<><p style={{margin:'0 0 10px',fontSize:14}}>Podés pagar directamente al profesional al finalizar. UGO registrará la confirmación del cobro.</p><button type="button" onClick={chooseCash} disabled={busy} style={{width:'100%',minHeight:44,border:0,borderRadius:12,background:'#128c4a',color:'#fff',fontWeight:800}}>{busy?'Guardando…':'Elegir pago en efectivo'}</button></>}{message&&<small style={{display:'block',marginTop:8}}>{message}</small>}</aside>
}
