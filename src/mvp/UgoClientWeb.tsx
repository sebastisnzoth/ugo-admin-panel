import React,{useMemo,useState}from'react'
import'./ugo-client-web.css'

type PageId='home'|'search'|'request'|'matching'|'active'|'activity'|'messages'|'payments'|'profile'|'help'|'settings'
type NavItem={id:PageId;label:string;icon:string;badge?:'live';count?:string}
type Pro={name:string;role:string;eta:string;km:string;rating:string;jobs:string;price:string;tag:string;avatar:string;status:string}
type RequestDraft={category:string;urgency:string;address:string;detail:string}

const nav:readonly NavItem[]=[
 {id:'home',label:'Inicio',icon:'⌂'},
 {id:'search',label:'Buscar servicio',icon:'⌕'},
 {id:'request',label:'Nueva solicitud',icon:'+'},
 {id:'matching',label:'Matching en vivo',icon:'◎',badge:'live'},
 {id:'active',label:'Servicios activos',icon:'▣',count:'2'},
 {id:'activity',label:'Actividad',icon:'◷'},
 {id:'messages',label:'Mensajes',icon:'◒',count:'3'},
 {id:'payments',label:'Pagos',icon:'R$'},
 {id:'profile',label:'Perfil',icon:'◉'},
 {id:'help',label:'Ayuda',icon:'?'},
 {id:'settings',label:'Configuración',icon:'⚙'},
]

const pros:Pro[]=[
 {name:'Roberto Silva',role:'Plomero & gasista',eta:'12 min',km:'1.8 km',rating:'4.9',jobs:'186',price:'R$ 145',tag:'Mejor coincidencia',avatar:'RS',status:'Disponible ahora'},
 {name:'Lucía Barros',role:'Reparos generales',eta:'8 min',km:'900 m',rating:'4.8',jobs:'94',price:'R$ 120',tag:'Más cerca',avatar:'LB',status:'Responde rápido'},
 {name:'Carlos Méndez',role:'Plomería y mantenimiento',eta:'14 min',km:'2.2 km',rating:'4.9',jobs:'221',price:'R$ 155',tag:'Alta reputación',avatar:'CM',status:'Agenda abierta'},
]
const services=[['Limpieza & Hogar','24 pros cerca','◌'],['Electricidad','12 pros cerca','ϟ'],['Plomería & Gas','8 pros cerca','⌁'],['Climatización','15 pros cerca','✺'],['Pintura Express','6 pros cerca','▣'],['Reparación general','9 pros cerca','◍']]
const categories=[['Todos los servicios','148','▦'],['Hogar y mantenimiento','45','🛠'],['Plomería y sanitarios','14','⌁'],['Electricidad residencial','18','ϟ'],['Gas y climatización','8','✺'],['Mantenimiento urgente','12','⚡']]
const timeline=[['07:42','Pedido recibido','UGO registró tu solicitud.'],['07:44','Matching en vivo','3 profesionales respondieron cerca de Canasvieiras.'],['07:47','Profesional seleccionado','Roberto Silva confirmó el servicio.'],['07:58','En camino','Se está desplazando hacia tu dirección.']]
const defaultDraft:RequestDraft={category:'Plomería y sanitarios',urgency:'Urgente',address:'Canasvieiras, Floripa',detail:'Hay una fuga en la cocina y necesitamos arreglo inmediato.'}

export function UgoClientWeb(){
  const[active,setActive]=useState<PageId>('home')
  const[requestDraft,setRequestDraft]=useState<RequestDraft>(defaultDraft)
  const[selectedProviderIndex,setSelectedProviderIndex]=useState(0)
  const[requestSent,setRequestSent]=useState(false)
  const[requestId,setRequestId]=useState('UG-8492')
  const title=useMemo(()=>nav.find(x=>x.id===active)?.label||'Inicio',[active])

  const submitRequest=()=>{
    setRequestSent(true)
    setRequestId('UG-' + (Math.floor(Math.random()*9000)+1000))
    setActive('matching')
  }

  const selectProvider=(idx:number)=>{
    setSelectedProviderIndex(idx)
    setRequestSent(true)
    setActive('active')
  }

  return <main className="ugo-client-web" data-page={active}>
   <Sidebar active={active} setActive={setActive}/>
   <section className="ucw-shell">
    <Topbar title={title} setActive={setActive}/>
    <div className="ucw-content">
     {active==='home'&&<HomePage setActive={setActive} requestSent={requestSent} requestId={requestId} requestDraft={requestDraft} onSelectService={(category:string)=>{setRequestDraft(prev=>({...prev,category}));setActive('request')}}/>}
     {active==='search'&&<SearchPage setActive={setActive} selectedProviderIndex={selectedProviderIndex} onPickProvider={selectProvider}/>} 
     {active==='request'&&<RequestPage requestDraft={requestDraft} setRequestDraft={setRequestDraft} onSubmit={submitRequest}/>} 
     {active==='matching'&&<MatchingPage requestId={requestId} requestDraft={requestDraft} selectedProviderIndex={selectedProviderIndex} onPickProvider={selectProvider} setActive={setActive}/>} 
     {active==='active'&&<ActiveServicePage setActive={setActive} requestId={requestId} selectedProvider={pros[selectedProviderIndex]} requestDraft={requestDraft}/>} 
     {active==='activity'&&<ActivityPage/>} 
     {active==='messages'&&<MessagesPage/>} 
     {active==='payments'&&<PaymentsPage/>} 
     {active==='profile'&&<ProfilePage setActive={setActive}/>} 
     {(active==='help'||active==='settings')&&<SupportPage title={title}/>} 
    </div>
   </section>
   <nav className="ucw-mobile-nav">{nav.slice(0,5).map(item=><button key={item.id} className={active===item.id?'active':''} onClick={()=>setActive(item.id)}><b>{item.icon}</b><span>{item.label}</span>{item.count&&<em>{item.count}</em>}</button>)}</nav>
  </main>
}

function Sidebar({active,setActive}:{active:PageId;setActive:(page:PageId)=>void}){return <aside className="ucw-sidebar"><div className="ucw-logo-row"><div className="ucw-logo-mark">UGO</div><div><strong>Cliente</strong><span>Floripa</span></div></div><nav className="ucw-nav">{nav.map(item=><button key={item.id} className={active===item.id?'active':''} onClick={()=>setActive(item.id)}><b>{item.icon}</b><span>{item.label}</span>{item.badge&&<i className="ucw-live">live</i>}{item.count&&<em>{item.count}</em>}</button>)}</nav></aside>}
function Topbar({title,setActive}:{title:string;setActive:(page:PageId)=>void}){return <header className="ucw-topbar"><div className="ucw-location"><b>Ubicación actual</b><span>Canasvieiras, Floripa</span></div><div className="ucw-top-actions"><button type="button" className="ucw-ghost" onClick={()=>setActive('request')}>Solicitar</button><button type="button" className="ucw-primary">Hugo</button></div></header>}
function HomePage({setActive,requestSent,requestId,requestDraft,onSelectService}:{setActive:(page:PageId)=>void;requestSent:boolean;requestId:string;requestDraft:RequestDraft;onSelectService:(category:string)=>void}){
  return <div className="ucw-dashboard ucw-home"><section className="ucw-main"><HeroCard setActive={setActive} onSelectService={onSelectService}/><Panel kicker="Servicios destacados" title="Qué necesitás hoy"><div className="ucw-service-grid">{services.map(([name,meta,icon],idx)=><button key={name} type="button" className="ucw-service-tile" onClick={()=>onSelectService(name.split('&')[0].trim())}><i>{icon}</i><div><strong>{name}</strong><small>{meta}</small></div><span>→</span></button>)}</div></Panel></section><RightRail requestSent={requestSent} requestId={requestId} requestDraft={requestDraft}/></div>
}
function HeroCard({setActive,onSelectService}:{setActive:(page:PageId)=>void;onSelectService:(category:string)=>void}){return <section className="ucw-home-hero"><div className="ucw-hello"><span className="ucw-sos">SOS 24/7</span><small>Red express de Floripa</small></div><h1>Necesitás ayuda ahora mismo.</h1><p>Buscamos el mejor profesional en minutos y te mantenemos informado en cada paso.</p><div className="ucw-hero-actions"><button type="button" className="ucw-primary" onClick={()=>setActive('request')}>Solicitar servicio</button><button type="button" className="ucw-ghost" onClick={()=>onSelectService('Plomería y sanitarios')}>Plomería urgente</button></div></section>}
function RightRail({requestSent,requestId,requestDraft}:{requestSent:boolean;requestId:string;requestDraft:RequestDraft}){return <aside className="ucw-right"><div className="ucw-protection"><b>Protección UGO activa</b><span>Perfiles visibles, reputación verificada y soporte en tiempo real.</span></div><div className="ucw-mini-panel"><small>Estado del pedido</small><strong>{requestSent?`Solicitado · ${requestId}`:'Sin solicitud activa'}</strong><span>{requestDraft.category}</span></div><div className="ucw-mini-panel"><small>Siguiente paso</small><strong>{requestSent?'Matching en vivo':'Seleccioná un servicio'}</strong><span>{requestSent?'Roberto y 2 más responden cerca.':'Te ayudamos a elegir en segundos.'}</span></div></aside>}
function SearchPage({setActive,selectedProviderIndex,onPickProvider}:{setActive:(page:PageId)=>void;selectedProviderIndex:number;onPickProvider:(idx:number)=>void}){return <div className="ucw-dashboard"><section className="ucw-filter"><Panel kicker="Búsqueda rápida" title="Categorías de servicios"><div className="ucw-chip-row">{categories.map(([name,count,icon],idx)=><button type="button" key={name} className={`ucw-chip ${idx===0?'active':''}`}><span>{icon}</span>{name}<em>{count}</em></button>)}</div></Panel></section><section className="ucw-main"><Panel kicker="Profesionales cerca" title="Mejores coincidencias"><div className="ucw-result-list">{pros.map((pro,idx)=><ProviderCard key={pro.name} pro={pro} onPick={()=>onPickProvider(idx)} compact={idx===selectedProviderIndex} rank={idx+1}/>)}</div></Panel></section></div>}
function RequestPage({requestDraft,setRequestDraft,onSubmit}:{requestDraft:RequestDraft;setRequestDraft:(value:RequestDraft)=>void;onSubmit:()=>void}){return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker="Crear nueva solicitud de servicio" title="Describe tu necesidad"><div className="ucw-form"><label><span>Categoría</span><select value={requestDraft.category} onChange={e=>setRequestDraft({...requestDraft,category:e.target.value})}><option>Plomería y sanitarios</option><option>Electricidad residencial</option><option>Hogar y mantenimiento</option><option>Gas y climatización</option></select></label><label><span>Urgencia</span><select value={requestDraft.urgency} onChange={e=>setRequestDraft({...requestDraft,urgency:e.target.value})}><option>Urgente</option><option>Hoy</option><option>Próxima semana</option></select></label><label><span>Dirección</span><input value={requestDraft.address} onChange={e=>setRequestDraft({...requestDraft,address:e.target.value})}/></label><label><span>Detalle</span><textarea rows={4} value={requestDraft.detail} onChange={e=>setRequestDraft({...requestDraft,detail:e.target.value})}/></label><div className="ucw-form-actions"><button type="button" className="ucw-ghost">Guardar borrador</button><button type="button" className="ucw-primary" onClick={onSubmit}>Solicitar servicio</button></div></div></Panel></section><aside className="ucw-right"><div className="ucw-mini-panel"><small>Tiempo estimado</small><strong>12–18 min</strong><span>hasta el primer profesional</span></div><div className="ucw-mini-panel"><small>Precio</small><strong>Desde R$ 120</strong><span>sin costos ocultos</span></div></aside></div>}
function MatchingPage({requestId,requestDraft,selectedProviderIndex,onPickProvider,setActive}:{requestId:string;requestDraft:RequestDraft;selectedProviderIndex:number;onPickProvider:(idx:number)=>void;setActive:(page:PageId)=>void}){const selected=pros[selectedProviderIndex]||pros[0];return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker={`Solicitud ${requestId}`} title="Matching en vivo"><div className="ucw-match-wrap"><div className="ucw-match-card"><strong>{requestDraft.category}</strong><span>{requestDraft.address}</span><small>{requestDraft.urgency}</small></div><div className="ucw-result-list">{pros.map((pro,idx)=><ProviderCard key={pro.name} pro={pro} onPick={()=>onPickProvider(idx)} compact={idx===selectedProviderIndex} rank={idx+1}/>)}</div></div></Panel></section><aside className="ucw-right"><div className="ucw-mini-panel"><small>Profesional sugerido</small><strong>{selected.name}</strong><span>{selected.role}</span></div><div className="ucw-mini-panel"><small>Flujo</small><strong>Confirmación en 60s</strong><button type="button" className="ucw-primary" style={{marginTop:12,width:'100%'}} onClick={()=>setActive('active')}>Confirmar trabajo</button></span></div></aside></div>}
function ActiveServicePage({setActive,requestId,selectedProvider,requestDraft}:{setActive:(page:PageId)=>void;requestId:string;selectedProvider:Pro;requestDraft:RequestDraft}){return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker={`Servicio activo · ${requestId}`} title="Tu trabajo ya está asignado"><div className="ucw-active-card"><div className="ucw-active-top"><div className="ucw-result-avatar">{selectedProvider.avatar}</div><div><strong>{selectedProvider.name}</strong><small>{selectedProvider.role}</small></div><span className="ucw-badge success">En camino</span></div><div className="ucw-track"><span style={{width:'68%'}} /></div><ul className="ucw-list"><li>Se está desplazando desde {selectedProvider.km}.</li><li>{requestDraft.category} · {requestDraft.address}</li><li>Confirmación por chat en vivo disponible.</li></ul><div className="ucw-form-actions"><button type="button" className="ucw-primary" onClick={()=>setActive('messages')}>Abrir chat</button><button type="button" className="ucw-ghost" onClick={()=>setActive('activity')}>Ver actividad</button></div></div></Panel></section><aside className="ucw-right"><div className="ucw-mini-panel"><small>ETA</small><strong>{selectedProvider.eta}</strong><span>según tráfico real</span></div><div className="ucw-mini-panel"><small>Protección</small><strong>Seguro UGO</strong><span>Pago y seguimiento sin complicaciones.</span></div></aside></div>}
function ActivityPage(){return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker="Actividad" title="Historial reciente"><div className="ucw-timeline">{timeline.map(([time,title,text],idx)=><div key={time} className={`ucw-time-item ${idx<3?'done':''}`}><span>{time}</span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div></Panel></section></div>}
function MessagesPage(){return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker="Chat en vivo" title="Roberto Silva en camino"><div className="ucw-chat-layout"><div className="ucw-chat-bubble me">Tengo una fuga en la cocina. Quedemos en 10 minutos.</div><div className="ucw-chat-bubble they">Perfecto, ya estoy saliendo con las herramientas necesarias.</div><div className="ucw-chat-bubble they">Te aviso cuando esté a 2 minutos.</div><div className="ucw-chat-input-row"><input defaultValue="Escribí un mensaje"/><button type="button" className="ucw-primary">Enviar</button></div></div></Panel></section></div>}
function PaymentsPage(){return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker="Gestión de pagos" title="Billetera UGO"><div className="ucw-money-grid"><article><span>Saldo disponible</span><strong>R$ 420,00</strong></article><article><span>Cobros pendientes</span><strong>R$ 145,00</strong></article><article><span>Pago seguro</span><strong>Visa · 2025</strong></article></div></Panel></section></div>}
function ProfilePage({setActive}:{setActive:(page:PageId)=>void}){return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker="Cliente UGO" title="Mariana Costa"><div className="ucw-profile-card"><div className="ucw-result-avatar lg">MC</div><div><strong>Perfil verificado</strong><span>Cliente desde 2024 · 12 servicios</span></div></div><div className="ucw-meta-grid"><div><small>Dirección</small><strong>Canasvieiras, Floripa</strong></div><div><small>Preferencias</small><strong>Urgencias + atención</strong></div></div><button type="button" className="ucw-primary" style={{marginTop:14}} onClick={()=>setActive('settings')}>Configurar notificaciones</button></div></Panel></section></div>}
function SupportPage({title}:{title:string}){return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker="UGO Cliente" title={title}><p className="ucw-muted">Centro preparado para ayudarte con servicios, pagos, garantías y soporte del profesional contratado.</p><div className="ucw-support-list"><button type="button" className="ucw-ghost">Soporte por chat</button><button type="button" className="ucw-ghost">Garantía y reembolso</button><button type="button" className="ucw-ghost">Preguntas frecuentes</button></div></Panel></section></div>}

function Panel({kicker,title,action,onAction,children}:{kicker:string;title:string;action?:string;onAction?:()=>void;children:React.ReactNode}){return <section className="ucw-card"><header className="ucw-card-head"><div><small>{kicker}</small><h3>{title}</h3></div>{action&&<button type="button" className="ucw-ghost small" onClick={onAction}>{action}</button>}</header>{children}</section>}
function MapPanel(){return <div className="ucw-map-panel"><div className="ucw-mapbar"><button>Mapa</button><button>Radar</button><button>Lista</button></div><span className="ucw-user-pin">Tu hogar</span><div className="ucw-map-visual"/></div>}
function RadarMap(){return <div className="ucw-map-panel compact"><i className="ring r1"/><i className="ring r2"/><i className="ring r3"/><b className="ucw-hub pulse">UGO</b>{pros.map((p,i)=><Marker key={p.name} className={['a','b','c'][i%3]} pro={p}/>)}</div>}
function RouteMap(){return <div className="ucw-route-map"><span>Casa</span><em>11 min</em><b>Roberto</b><i/></div>}
function Marker({className,pro}:{className:string;pro:Pro}){return <button className={`ucw-marker ${className}`}><b>{pro.avatar}</b><span>{pro.eta}<small>{pro.km}</small></span></button>}
function ProviderCard({pro,onPick,compact=false,rank}:{pro:Pro;onPick:()=>void;compact?:boolean;rank?:number}){return <article className={`ucw-provider-card${compact?' compact':''}`}><div className="ucw-result-avatar">{pro.avatar}</div><div className="ucw-provider-main"><small>#{rank}</small><strong>{pro.name}</strong><span>{pro.role}</span><div className="ucw-provider-meta"><b>{pro.rating}</b><em>{pro.jobs} jobs</em><small>{pro.status}</small></div></div><div className="ucw-provider-side"><strong>{pro.price}</strong><span>{pro.eta}</span><button type="button" className="ucw-primary" onClick={onPick}>{compact?'Seleccionado':'Elegir'}</button></div></article>}
function ServiceResult({pro,onPick,index}:{pro:Pro;onPick:()=>void;index:number}){return <article className="ucw-result-card"><div className="ucw-result-avatar">{pro.avatar}</div><div><small>#{index+1}</small><strong>{pro.name}</strong><p>{pro.role}</p></div><button type="button" className="ucw-primary" onClick={onPick}>Elegir</button></article>}
function Timeline({compact=false}:{compact?:boolean}){return <ol className={`ucw-timeline${compact?' compact':''}`}>{timeline.map(([time,title,text],idx)=><li key={time} className={idx<3?'done':'next'}><span>{time}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol>}
function Stepper(){return <div className="ucw-stepper">{['Categoría','Fotos','Detalle','Dirección','Confirmar'].map((s,i)=><span key={s} className={i<2?'done':i===2?'current':''}>{i+1}. {s}</span>)}</div>}
