import React,{useCallback,useEffect,useMemo,useState}from'react'
import{useRoleSession,type Service}from'../shared'

type Payment={id:string;servicio_id:string;metodo?:string|null;estado:string;pix_copia_cola?:string|null;pix_qr_code?:string|null;pix_expira_at?:string|null;mp_payment_id?:string|null;pago_externo_id?:string|null;pix_e2e_id?:string|null}
const PAYMENT_STATES=['asignado']

export function ClientPaymentChoice(){
 const auth=useRoleSession('client'),{supabase,session}=auth
 const[service,setService]=useState<Service|null>(null),[payment,setPayment]=useState<Payment|null>(null),[busy,setBusy]=useState<'pix'|'cash'|''>(''),[message,setMessage]=useState('')
 const load=useCallback(async()=>{if(!session){setService(null);setPayment(null);return}const{data:rows}=await supabase.from('servicios').select('*').eq('cliente_id',session.user.id).in('estado',PAYMENT_STATES).order('created_at',{ascending:false}).limit(1);const current=((rows||[])[0]as Service|undefined)||null;setService(current);if(!current){setPayment(null);return}const{data:p}=await supabase.from('pagos').select('id,servicio_id,metodo,estado,pix_copia_cola,pix_qr_code,pix_expira_at,mp_payment_id,pago_externo_id,pix_e2e_id,created_at').eq('servicio_id',current.id).order('created_at',{ascending:false}).limit(1).maybeSingle();setPayment((p as Payment|null)||null)},[session,supabase])
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load])
 useEffect(()=>{if(!session)return;const ch=supabase.channel(`client-payment-choice-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'pagos'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`cliente_id=eq.${session.user.id}`},()=>void load()).subscribe();return()=>{supabase.removeChannel(ch)}},[load,session,supabase])
 const selected=payment?.metodo||''
 const protectedPayment=Boolean(payment&&(payment.estado==='retenido'||payment.estado==='liberado')&&(payment.mp_payment_id||payment.pago_externo_id||payment.pix_e2e_id))
 const cashSelected=selected==='efectivo'
 const retryable=payment?.estado==='fallido'
 const pixLocked=Boolean(selected==='pix'&&!retryable)
 const qr=useMemo(()=>payment?.pix_qr_code?`data:image/png;base64,${payment.pix_qr_code}`:'',[payment?.pix_qr_code])
 if(auth.loading||!session||!service||protectedPayment||cashSelected)return null

 async function chooseCash(){setBusy('cash');setMessage('');try{const{error}=await supabase.rpc('seleccionar_pago_efectivo',{p_servicio_id:service.id});if(error)throw error;setMessage('Efectivo seleccionado. El profesional ya puede preparar la salida.');await load()}catch(e){setMessage(e instanceof Error?e.message:'No se pudo elegir efectivo.')}finally{setBusy('')}}
 async function choosePix(){if(!session.access_token)return;setBusy('pix');setMessage('');try{const response=await fetch('/api/pagos/crear',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({servicioId:service.id,metodo:'pix'})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'No se pudo generar Pix.');setMessage(body.alreadyPaid?'El pago ya estaba confirmado.':'Pix generado. Confirmalo para habilitar la salida del profesional.');await load()}catch(e){setMessage(e instanceof Error?e.message:'No se pudo generar Pix.')}finally{setBusy('')}}
 async function copyPix(){if(!payment?.pix_copia_cola)return;try{await navigator.clipboard.writeText(payment.pix_copia_cola);setMessage('Código Pix copiado.')}catch{setMessage('No pudimos copiarlo automáticamente. Seleccioná el código manualmente.')}}

 return <section className="ugo-client-payment-choice" aria-label="Elegir forma de pago">
  <header><small>SERVICIO #{service.numero}</small><h2>{pixLocked?'Completá el pago':'¿Cómo querés pagar?'}</h2><p>{pixLocked?'Ya generaste un Pix para este servicio. Confirmalo para continuar.':'Elegí una opción sin salir del servicio. UGO mantiene el mismo seguimiento.'}</p></header>
  <div className="ugo-client-payment-options">
   <button type="button" className={selected==='pix'?'selected':''} onClick={choosePix} disabled={Boolean(busy)||pixLocked}><span>⚡</span><div><b>Pix</b><small>{pixLocked?'Pix generado y pendiente de confirmación.':'Pago electrónico confirmado dentro de UGO.'}</small></div><i>{selected==='pix'?'✓':'›'}</i></button>
   {!pixLocked&&<button type="button" onClick={chooseCash} disabled={Boolean(busy)}><span>💵</span><div><b>Efectivo</b><small>Pagás al profesional al finalizar. UGO registra la confirmación.</small></div><i>›</i></button>}
  </div>
  {busy&&<div className="ugo-client-payment-feedback">{busy==='pix'?'Preparando Pix…':'Guardando forma de pago…'}</div>}
  {selected==='pix'&&payment?.pix_copia_cola&&<div className="ugo-client-pix-box">{qr&&<img src={qr} alt="QR Code Pix"/>}<b>Escaneá o copiá el código Pix</b><textarea readOnly value={payment.pix_copia_cola}/><button type="button" onClick={copyPix}>Copiar código Pix</button>{payment.pix_expira_at&&<small>Válido hasta {new Date(payment.pix_expira_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small>}</div>}
  {message&&<div className="ugo-client-payment-feedback">{message}</div>}
 </section>
}
