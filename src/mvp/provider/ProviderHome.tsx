import React from'react'
import{Button,Card,SectionHeader,StatusPill}from'../../shared/ui'
import{useProviderFlow}from'./providerFlow'
import{useProviderData,money}from'./providerData'

export function ProviderHome(){
 const flow=useProviderFlow(),d=useProviderData()
 const next=d.service
  ?{eyebrow:'TRABAJO ACTIVO',title:'Tenés un trabajo en marcha',text:d.cashSelected?'El cliente eligió efectivo. Seguí el trabajo y marcá cada paso.':d.funded?'El pago está confirmado. Andá, resolvé y marcá listo.':'Esperá la confirmación de pago antes de salir.',action:flow.actions.openActiveJob,label:'Continuar trabajo'}
  :d.debtBlocked
   ?{eyebrow:'COMISIONES UGO',title:'Pagá a UGO para volver al radar',text:`Tenés ${d.pendingDebtCount} servicios con comisión pendiente. Al llegar a 3, no podés recibir ni aceptar nuevos pedidos.`,action:flow.actions.openEarnings,label:'Pagar UGO'}
  :d.opportunities.length
   ?{eyebrow:'NUEVOS PEDIDOS',title:`Tenés ${d.opportunities.length} pedido${d.opportunities.length===1?'':'s'} para vos`,text:'Mirá qué hay que resolver, dónde, cuándo y cuánto. Aceptá sólo lo que realmente podés hacer.',action:flow.actions.openOpportunities,label:'Ver pedidos'}
  :d.online
   ?{eyebrow:'LISTO PARA TRABAJAR',title:'Estás en el radar de UGO',text:'No tenés pedidos compatibles ahora. Podés dejar la app abierta: UGO te avisa cuando llegue uno.',action:()=>void d.reload(),label:'Actualizar ahora'}
   :{eyebrow:'FUERA DEL RADAR',title:'Ponete Online para recibir trabajos',text:'Cuando estés disponible, activá tu estado y UGO empezará a buscar pedidos compatibles.',action:d.toggleOnline,label:'Ponerme Online'}
 return <section className="provider-screen provider-home" aria-labelledby="provider-home-title">
  <SectionHeader eyebrow="UGO PRO" title={`Hola, ${d.name}`} description={`⭐ ${d.karma.toFixed(1)} · ${d.provider.ciudad_base||'Tu zona'}`} actions={<Button className={`provider-status ${d.online?'is-online':'is-offline'}`} type="button" onClick={d.toggleOnline} disabled={d.busy||(d.debtBlocked&&!d.online)} aria-pressed={d.online}>{d.online?'Online':'Offline'}</Button>}/>
  <Card className="provider-hero provider-focus-card">
   <StatusPill tone={d.debtBlocked?'danger':d.service?'warning':d.online?'success':'neutral'}>{next.eyebrow}</StatusPill>
   <h2>{next.title}</h2><p>{next.text}</p>
   <Button variant="primary" size="lg" className="provider-primary provider-main-action" onClick={next.action} disabled={d.busy}>{d.busy?'Procesando…':next.label}</Button>
  </Card>
  {d.debtBlocked&&<Card className="provider-card provider-debt-lock"><StatusPill tone="danger">Nuevos pedidos pausados</StatusPill><span>Debés {money(d.ugoDebt)} en {d.pendingDebtCount} comisiones. Tus trabajos ya asignados siguen disponibles, pero no recibirás ni podrás aceptar otros hasta conciliar al menos una.</span><Button variant="primary" className="provider-primary provider-wide" onClick={flow.actions.openEarnings}>PAGAR UGO</Button></Card>}
  <div className="provider-quick-grid">
   {d.service&&d.opportunities.length>0&&<Card className="provider-card provider-quick-card" role="button" tabIndex={0} onClick={flow.actions.openOpportunities} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')flow.actions.openOpportunities()}}><small>NUEVOS PEDIDOS</small><strong>{d.opportunities.length} disponible{d.opportunities.length===1?'':'s'}</strong><span>Podés aceptar otro →</span></Card>}
   <Card className="provider-card provider-quick-card" role="button" tabIndex={0} onClick={flow.actions.openAgenda} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')flow.actions.openAgenda()}}><small>AGENDA</small><strong>Próximos trabajos</strong><span>Ver horarios →</span></Card>
   <Card className="provider-card provider-quick-card" role="button" tabIndex={0} onClick={flow.actions.openEarnings} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')flow.actions.openEarnings()}}><small>DINERO</small><strong>Saldo UGO {money(d.released)}</strong><span>Efectivo {money(d.cashReceived)} · Debés UGO {money(d.ugoDebt)} →</span></Card>
  </div>
  {d.online&&<Button variant="ghost" className="provider-quiet-link" type="button" onClick={flow.actions.openDemand}>Ver radar de demanda</Button>}
 </section>
}
