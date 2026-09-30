import{useClientFlow}from'../flow/clientFlow'
import'./clientSupportScreen.css'

export function ClientSupportScreen(){
 const flow=useClientFlow()
 return <main className="ugo-client-support-screen" aria-label="Ayuda y soporte">
  <header><button type="button" onClick={()=>flow.navigate('home')} aria-label="Volver al inicio">←</button><div><small>UGO · CLIENTE</small><h1>Ayuda y soporte</h1></div></header>
  <section>
   <div className="ugo-client-support-intro"><span>?</span><div><h2>¿Con qué necesitás ayuda?</h2><p>Para un problema con un trabajo, abrí el pedido exacto desde Actividad. Para cuenta, direcciones, pago o contraseña, entrá a tu Perfil.</p></div></div>
   <div className="ugo-client-support-actions">
    <button type="button" onClick={()=>flow.navigate('history')}><span>◷</span><div><b>Actividad y pedidos</b><small>Seguimiento, evidencias, chat, pagos y disputas del servicio.</small></div><i>→</i></button>
    <button type="button" onClick={()=>flow.navigate('profile')}><span>◉</span><div><b>Cuenta y configuración</b><small>Perfil, lugares guardados, forma de pago y seguridad.</small></div><i>→</i></button>
   </div>
   <aside><b>¿Es una urgencia?</b><p>UGO conecta servicios profesionales, pero no reemplaza a policía, bomberos, emergencias médicas ni servicios públicos de emergencia.</p></aside>
  </section>
 </main>
}
export default ClientSupportScreen
