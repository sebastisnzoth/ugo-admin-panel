import React from'react'
import{useProviderFlow}from'./providerFlow'

export function ProviderHome(){
 const flow=useProviderFlow()
 return <section className="provider-screen provider-home" aria-labelledby="provider-home-title">
  <header className="provider-top"><div><span className="provider-kicker">UGO PRO · HOY</span><h1 id="provider-home-title">Hola, profesional</h1></div><button className="provider-status is-online" type="button" aria-label="Cambiar disponibilidad">● Online</button></header>
  <article className="provider-hero"><span>Tu próxima acción</span><h2>Buscá oportunidades cerca tuyo</h2><p>Revisá la demanda activa y elegí el trabajo que mejor encaje con vos.</p><button className="provider-primary" onClick={flow.actions.openDemand}>Ver demanda</button></article>
  <div className="provider-grid"><button className="provider-card" onClick={flow.actions.openOpportunities}><strong>Oportunidades</strong><span>Ver trabajos compatibles →</span></button><button className="provider-card" onClick={flow.actions.openEarnings}><strong>Hoy</strong><span>Ganancias y pagos →</span></button></div>
 </section>
}
