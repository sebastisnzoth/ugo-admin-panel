import React from'react'
import{Button,Card,SectionHeader,StatusPill}from'../../shared/ui'
import{useProviderFlow}from'./providerFlow'
import{useProviderData,money}from'./providerData'

export function ProviderHome(){
 const flow=useProviderFlow(),d=useProviderData()
 const demandTop=[...d.demand].sort((a,b)=>(b.demandLevel==='high'?3:b.demandLevel==='medium'?2:1)-(a.demandLevel==='high'?3:a.demandLevel==='medium'?2:1))[0]||null
 const availability=d.debtBlocked
  ?{tone:'danger' as const,title:'Pedidos pausados',text:`Tenés ${d.pendingDebtCount} servicios con comisión pendiente. Pagá al menos una para volver al radar.`}
  :!d.online
   ?{tone:'neutral' as const,title:'Estás Offline',text:'Activá Online para entrar al radar y recibir pedidos compatibles con tu categoría.'}
   :!d.matchingReady
    ?{tone:'warning' as const,title:'Online pero fuera del radar',text:'UGO necesita una ubicación reciente (menos de 90 segundos) para enviarte pedidos.'}
    :{tone:'success' as const,title:'En el radar de UGO',text:'Estás disponible y con ubicación vigente. UGO te avisa cuando llegue un pedido compatible.'}
 const next=d.service
  ?{eyebrow:'TRABAJO ACTIVO',title:'Tenés un trabajo en marcha',text:d.cashSelected?'El cliente eligió efectivo. Seguí el trabajo y marcá cada paso.':d.funded?'El pago está confirmado. Andá, resolvé y marcá listo.':'Esperá la confirmación de pago antes de salir.',action:flow.actions.openActiveJob,label:'Continuar trabajo'}
  :d.debtBlocked
   ?{eyebrow:'COMISIONES UGO',title:'Pagá a UGO para volver al radar',text:`Tenés ${d.pendingDebtCount} servicios con comisión pendiente. Al llegar a 3, no podés recibir ni aceptar nuevos pedidos.`,action:flow.actions.openEarnings,label:'Pagar UGO'}
  :d.opportunities.length
   ?{eyebrow:'NUEVOS PEDIDOS',title:`Tenés ${d.opportunities.length} pedido${d.opportunities.length===1?'':'s'} para vos`,text:'Mirá qué hay que resolver, dónde, cuándo y cuánto. Aceptá sólo lo que realmente podés hacer.',action:flow.actions.openOpportunities,label:'Ver pedidos'}
  :d.online&&!d.matchingReady
   ?{eyebrow:'GPS NECESITA ATENCIÓN',title:'Estás Online, pero todavía fuera del radar',text:'UGO necesita una ubicación reciente para poder enviarte pedidos. Renovala ahora sin apagar tu disponibilidad.',action:()=>void d.setOnline(true),label:'Actualizar ubicación'}
  :d.online
   ?{eyebrow:'LISTO PARA TRABAJAR',title:'Estás en el radar de UGO',text:'Tu GPS está vigente y podés recibir pedidos compatibles. Podés dejar la app abierta: UGO te avisa cuando llegue uno.',action:()=>void d.reload(),label:'Actualizar ahora'}
   :{eyebrow:'FUERA DEL RADAR',title:'Ponete Online para recibir trabajos',text:'Cuando estés disponible, activá tu estado y UGO empezará a buscar pedidos compatibles.',action:d.toggleOnline,label:'Ponerme Online'}
 return <section className="provider-screen provider-home" aria-label="Inicio del proveedor">
  <SectionHeader screenHeading eyebrow="UGO PRO" title={`Hola, ${d.name}`} description={`Calificación ${d.karma.toFixed(1)} de 5 · ${d.provider.ciudad_base||'Tu zona'}`} actions={<Button className={`provider-status ${d.online?'is-online':'is-offline'}`} type="button" onClick={d.toggleOnline} disabled={d.busy||(d.debtBlocked&&!d.online)} aria-pressed={d.online} aria-label={d.online?(d.matchingReady?'Desactivar disponibilidad: Online y GPS vigente':'Desactivar disponibilidad: Online, GPS pendiente'):'Activar disponibilidad: Offline'}>{d.online?'Online':'Offline'}</Button>}/>
  <div className="provider-home-overview"><Card className="provider-card provider-hero provider-focus-card">
   <StatusPill tone={d.debtBlocked?'danger':d.service?'warning':d.online&&!d.matchingReady?'warning':d.online?'success':'neutral'}>{next.eyebrow}</StatusPill>
   <h2>{next.title}</h2><p>{next.text}</p>
   <Button variant="primary" size="lg" className="provider-primary provider-main-action" onClick={next.action} disabled={d.busy}>{d.busy?'Procesando…':next.label}</Button>
  </Card>
  <Card className={`provider-card provider-status-card is-${availability.tone}`} aria-live="polite">
   <div className="provider-status-card-head">
    <div><small>ESTADO OPERATIVO</small><strong>{availability.title}</strong></div>
    <StatusPill tone={availability.tone}>{d.debtBlocked?'Pausado':!d.online?'Offline':!d.matchingReady?'GPS pendiente':'Disponible'}</StatusPill>
   </div>
   <p>{availability.text}</p>
   <div className="provider-status-facts">
    <span className={d.online&&d.matchingReady&&!d.debtBlocked?'is-ok':'is-alert'}><i aria-hidden="true">●</i>{d.online&&d.matchingReady&&!d.debtBlocked?'Disponible para pedidos':d.debtBlocked?'Pedidos pausados':d.online?'Esperando GPS':'No recibe pedidos'}</span>
    <span className={d.matchingReady?'is-ok':'is-alert'}><i aria-hidden="true">⌖</i>{d.matchingReady?'Ubicación vigente':'GPS pendiente de actualización'}</span>
    <span className={d.debtBlocked?'is-alert':''}><i aria-hidden="true">$</i>{d.debtBlocked?`${d.pendingDebtCount} comisiones pendientes`:'Comisiones al día'}</span>
   </div>
   {!d.debtBlocked&&(!d.online||!d.matchingReady)&&<Button variant="primary" className="provider-primary provider-wide" disabled={d.busy} onClick={()=>void d.setOnline(true)}>{d.online?'Actualizar ubicación':'Ponerme Online'}</Button>}
  </Card>
  </div>
  {d.debtBlocked&&<Card className="provider-card provider-debt-lock"><StatusPill tone="danger">Nuevos pedidos pausados</StatusPill><span>Debés {money(d.ugoDebt)} en {d.pendingDebtCount} comisiones. Tus trabajos ya asignados siguen disponibles, pero no recibirás ni podrás aceptar otros hasta conciliar al menos una.</span><Button variant="primary" className="provider-primary provider-wide" onClick={flow.actions.openEarnings}>PAGAR UGO</Button></Card>}
  {d.service&&d.opportunities.length>0&&<Card className="provider-card provider-next-opportunities"><StatusPill tone="success">PRÓXIMOS TRABAJOS</StatusPill><h2>Podés aceptar otro pedido programado</h2><p>Tenés {d.opportunities.length} oportunidad{d.opportunities.length===1?'':'es'} disponible{d.opportunities.length===1?'':'s'}. Revisá horarios y compatibilidad antes de aceptar; tu trabajo activo sigue en curso.</p><Button variant="primary" onClick={flow.actions.openOpportunities}>Revisar pedidos futuros</Button></Card>}
  <h2 className="provider-home-section-title">Accesos rápidos</h2>
  <div className="provider-quick-grid">
   <button type="button" className="provider-card provider-quick-card" onClick={flow.actions.openOpportunities}><small>PEDIDOS</small><strong>{d.opportunities.length?`${d.opportunities.length} disponibles`:"Ver pedidos"}</strong><span>Oportunidades para vos →</span></button>
   <button type="button" className="provider-card provider-quick-card" onClick={flow.actions.openAgenda}><small>AGENDA</small><strong>Próximos trabajos</strong><span>Ver horarios →</span></button>
   <button type="button" className="provider-card provider-quick-card" onClick={flow.actions.openEarnings}><small>DINERO</small><strong>Saldo UGO {money(d.released)}</strong><span>Efectivo {money(d.cashReceived)} · Debés UGO {money(d.ugoDebt)} →</span></button>
  </div>
  {demandTop?<Card className="provider-card provider-radar-glance">
   <div className="provider-radar-glance-head">
    <div><small>DEMANDA · ÚLTIMAS 24 H</small><strong>{d.demand.length===1?'1 zona con pedidos':`${d.demand.length} zonas con pedidos`}</strong></div>
    <StatusPill tone={demandTop.demandLevel==='high'?'success':demandTop.demandLevel==='medium'?'warning':'neutral'}>{demandTop.demandLevel==='high'?'Movimiento alto':demandTop.demandLevel==='medium'?'Movimiento medio':'Movimiento bajo'}</StatusPill>
   </div>
   <p>{demandTop.zone} · promedio {money(demandTop.estimatedValue)}</p>
   <Button variant="ghost" onClick={flow.actions.openDemand}>Ver radar completo</Button>
  </Card>:d.online&&<Button variant="ghost" className="provider-quiet-link" type="button" onClick={flow.actions.openDemand}>Ver radar de demanda</Button>}
 </section>
}
