import React,{useEffect,useState}from'react'
import{useRoleSession}from'../../../mvp/shared'
import{useClientFlow}from'../flow/clientFlow'
type Method='efectivo'|'pix'
export function ClientZipPayments(){
 const{session,supabase}=useRoleSession('client'),flow=useClientFlow()
 const[method,setMethod]=useState<Method>('efectivo'),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{
  if(!session)return
  let mounted=true
  void supabase.from('preferencias_pago_cliente').select('metodo').eq('usuario_id',session.user.id).maybeSingle().then(({data,error})=>{
   if(!mounted)return
   if(error)setMessage('No pudimos cargar tu preferencia. Reintentá desde Mi perfil.')
   setMethod(data?.metodo==='pix'?'pix':'efectivo');setLoading(false)
  })
  return()=>{mounted=false}
 },[session,supabase])
 async function choose(next:Method){
  if(saving||next===method)return
  setSaving(true);setMessage('')
  const{error}=await supabase.rpc('set_preorder_payment_preference',{p_metodo:next})
  setSaving(false)
  if(error){setMessage('No pudimos guardar el método de pago. El anterior sigue vigente.');return}
  setMethod(next);setMessage('Preferencia de pago guardada.')
 }
 return <main className="ugo-zip-payments-page" aria-label="Pagos y métodos">
  <div className="ugo-zip-section-title"><div><span>TU CUENTA UGO</span><h2>Pagos y métodos</h2><p>Elegí la forma de pago preferida para futuros pedidos.</p></div></div>
  <section className="ugo-zip-payments-card"><h3>Método predeterminado</h3><p>La forma de pago final de cada servicio se confirma en el flujo del pedido. No se realiza ningún cobro al cambiar esta preferencia.</p>
   {loading?<p role="status">Cargando preferencia…</p>:<div className="ugo-zip-payment-methods">
    <button type="button" className={method==='efectivo'?'selected':''} disabled={saving} onClick={()=>void choose('efectivo')}><span>💵</span><strong>Efectivo</strong><small>Pagás al finalizar el trabajo</small><b>{method==='efectivo'?'✓ Elegido':'Seleccionar'}</b></button>
    <button type="button" className={method==='pix'?'selected':''} disabled={saving} onClick={()=>void choose('pix')}><span>▦</span><strong>PIX</strong><small>Medio de pago instantáneo</small><b>{method==='pix'?'✓ Elegido':'Seleccionar'}</b></button>
   </div>}
   {message&&<p role="status" className="ugo-zip-notice">{message}</p>}
  </section>
  <section className="ugo-zip-payments-card"><h3>Historial de pagos y servicios</h3><p>Los importes y comprobantes se muestran dentro del detalle de cada servicio real, sin inventar transacciones.</p><button type="button" onClick={()=>flow.navigate('history')}>Consultar mi actividad →</button></section>
 </main>
}
