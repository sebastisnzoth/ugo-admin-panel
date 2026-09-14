import React from'react'
import{ProviderPayoutPanel}from'../ProviderPayoutPanel'
import{useProviderData,money}from'./providerData'
import{useProviderFlow}from'./providerFlow'

export function ProviderEarnings(){
 const d=useProviderData(),flow=useProviderFlow()
 return <section className="provider-screen provider-earnings-complete" aria-labelledby="provider-earnings-title">
  <button type="button" className="provider-back" onClick={flow.actions.openProfile}>← Perfil</button>
  <header className="provider-section-head"><div><span className="provider-kicker">TU DINERO</span><h1 id="provider-earnings-title">Ganancias</h1><p>Revisá qué está protegido, qué fue liberado y cómo retirar tus fondos.</p></div><button className="provider-link" type="button" onClick={flow.actions.openHistory}>Trabajos</button></header>
  <div className="provider-balance-grid">
   <article><small>LIBERADO</small><strong>{money(d.released)}</strong><span>Disponible o registrado para cobro</span></article>
   <article><small>EN PROCESO</small><strong>{money(d.retained)}</strong><span>Protegido hasta cerrar el trabajo</span></article>
  </div>
  <article className="provider-withdraw-guide"><span>1</span><div><strong>Vinculá tu cuenta</strong><p>Conectá Mercado Pago o registrá la cuenta de cobro habilitada.</p></div><span>2</span><div><strong>Elegí el monto</strong><p>El retiro manual mínimo es R$ 50 y nunca puede superar el saldo disponible.</p></div><span>3</span><div><strong>Seguí la transferencia</strong><p>Pendiente o procesando no significa pagado: UGO lo confirma cuando el dinero realmente sale.</p></div></article>
  <ProviderPayoutPanel accessToken={d.accessToken}/>
  <button className="provider-secondary provider-wide" type="button" onClick={flow.actions.openHistory}>Ver trabajos realizados</button>
 </section>
}
