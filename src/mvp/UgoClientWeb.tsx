import React,{useMemo,useState}from'react'
import'./ugo-client-web.css'

const tabs=[
 {id:'home',label:'Inicio',icon:'⌂'},
 {id:'search',label:'Buscar servicio',icon:'⌕'},
 {id:'request',label:'Nueva solicitud',icon:'+'},
 {id:'matching',label:'Matching en vivo',icon:'◌'},
 {id:'service',label:'Servicios activos',icon:'▣'},
 {id:'messages',label:'Mensajes',icon:'◒'},
 {id:'payments',label:'Pagos',icon:'R$'},
 {id:'profile',label:'Perfil',icon:'◎'},
]as const

type PageId=typeof tabs[number]['id']
type Pro={name:string;role:string;eta:string;rating:string;jobs:string;price:string;tag:string}

const categories=[
 ['Limpieza & Hogar','24 pros cerca','◌'],
 ['Electricidad','12 pros cerca','ϟ'],
 ['Plomería & Gas','8 pros cerca','⌁'],
 ['Climatización','15 pros cerca','✺'],
 ['Pintura','21 pros cerca','▧'],
 ['Tecnología','18 pros cerca','▤'],
]
const pros:Pro[]=[
 {name:'Roberto Silva',role:'Electricidad residencial',eta:'12 min',rating:'4.9',jobs:'186 servicios',price:'R$ 145/h',tag:'Mejor coincidencia'},
 {name:'Lucía Barros',role:'Reparos generales',eta:'8 min',rating:'4.8',jobs:'94 servicios',price:'R$ 120/h',tag:'Más cerca'},
 {name:'Carlos Méndez',role:'Plomería & mantenimiento',eta:'14 min',rating:'4.9',jobs:'221 servicios',price:'R$ 155/h',tag:'Alta reputación'},
]
const activity=[
 ['07:42','Pedido recibido','UGO registró tu solicitud y activó el radar de profesionales.'],
 ['07:44','Matching en vivo','3 profesionales disponibles respondieron dentro de Canasvieiras.'],
 ['07:47','Profesional seleccionado','Roberto Silva quedó como mejor opción por cercanía y reputación.'],
 ['07:59','En camino','ETA estimado actualizado según distancia y disponibilidad.'],
]

export function UgoClientWeb(){
 const[active,setActive]=useState<PageId>('home')
 const activeTab=useMemo(()=>tabs.find(t=>t.id===active)||tabs[0],[active])
 return <main className="ugo-client-web" data-page={active}>
  <aside className="ucw-rail" aria-label="Navegación UGO Cliente Web">
   <div className="ucw-brand"><span>UGO</span><small>Cliente Web</small></div>
   <nav>{tabs.map(item=><button key={item.id} type="button" className={active===item.id?'active':''} onClick={()=>setActive(item.id)}><b>{item.icon}</b><span>{item.label}</span>{item.id==='matching'&&<em>Live</em>}{item.id==='messages'&&<i>3</i>}</button>)}</nav>
   <div className="ucw-rail-card"><strong>Hugo IA</strong><span>Diagnóstico rápido, resumen del pedido y próximos pasos.</span><button type="button" onClick={()=>setActive('request')}>Crear solicitud</button></div>
  </aside>
  <section className="ucw-app">
   <header className="ucw-topbar">
    <div><small>Canasvieiras, Florianópolis · SC</small><h1>{activeTab.label}</h1></div>
    <label className="ucw-top-search"><span>⌕</span><input placeholder="Buscar servicio, profesional o pedido"/></label>
    <a className="ucw-open-real" href="/?app=client">Abrir app real</a>
    <button type="button" className="ucw-avatar" onClick={()=>setActive('profile')} aria-label="Abrir perfil">M</button>
   </header>
   {active==='home'&&<HomePage setActive={setActive}/>} 
   {active==='search'&&<SearchPage setActive={setActive}/>} 
   {active==='request'&&<RequestPage setActive={setActive}/>} 
   {active==='matching'&&<MatchingPage setActive={setActive}/>} 
   {active==='service'&&<ServicePage setActive={setActive}/>} 
   {active==='messages'&&<MessagesPage/>} 
   {active==='payments'&&<PaymentsPage/>} 
   {active==='profile'&&<ProfilePage/>} 
  </section>
  <nav className="ucw-mobile-nav">{tabs.slice(0,5).map(item=><button key={item.id} type="button" className={active===item.id?'active':''} onClick={()=>setActive(item.id)}><b>{item.icon}</b><span>{item.label.replace(' servicio','').replace(' en vivo','')}</span></button>)}</nav>
 </main>
}

function HomePage({setActive}:{setActive:(page:PageId)=>void}){return <div className="ucw-grid ucw-home">
 <section className="ucw-hero"><div className="ucw-hero-copy"><p className="ucw-kicker">PERSONAS REALES · SOLUCIONES REALES</p><h2>Servicios del hogar con seguimiento claro desde el primer toque.</h2><p>Versión web inspirada en el paquete Stitch adjunto: radar, búsqueda, solicitud, matching, tracking, mensajes, pagos y perfil en una experiencia desktop/mobile consistente.</p><div className="ucw-actions"><button type="button" onClick={()=>setActive('request')}>Diagnóstico con Hugo IA</button><button type="button" onClick={()=>setActive('search')}>Buscar profesionales</button></div></div><RadarCard/></section>
 <section className="ucw-panel ucw-span-2"><div className="ucw-section-head"><div><small>Servicios populares</small><h3>Qué resolvemos hoy</h3></div><button type="button" onClick={()=>setActive('search')}>Ver todos</button></div><div className="ucw-category-grid">{categories.map(([name,meta,icon])=><button type="button" key={name} onClick={()=>setActive('search')}><b>{icon}</b><span>{name}</span><small>{meta}</small></button>)}</div></section>
 <section className="ucw-panel"><div className="ucw-section-head"><div><small>Pedido activo</small><h3>Reparación eléctrica</h3></div><strong className="ucw-pill live">En camino</strong></div><Timeline compact/><button className="ucw-wide" type="button" onClick={()=>setActive('service')}>Ver seguimiento</button></section>
 <section className="ucw-panel"><div className="ucw-section-head"><div><small>Hugo IA</small><h3>Resumen del hogar</h3></div><strong className="ucw-pill">Listo</strong></div><div className="ucw-hugo-box">Detecté urgencia media, dirección en Canasvieiras y preferencia por contacto WhatsApp. Podés convertir esto en solicitud.</div><button className="ucw-wide ghost" type="button" onClick={()=>setActive('request')}>Continuar solicitud</button></section>
 </div>}

function SearchPage({setActive}:{setActive:(page:PageId)=>void}){return <div className="ucw-grid"><section className="ucw-panel ucw-span-2"><div className="ucw-section-head"><div><small>Búsqueda rápida</small><h3>Directorio de profesionales</h3></div><strong className="ucw-pill">Canasvieiras +8 km</strong></div><div className="ucw-filters"><button className="active">Todos</button><button>Hogar</button><button>Electricidad</button><button>Plomería</button><button>Disponible ahora</button></div><div className="ucw-pro-list">{pros.map(pro=><ProviderCard key={pro.name} pro={pro} onPick={()=>setActive('service')}/>)}</div></section><section className="ucw-panel"><MapMock/><div className="ucw-map-caption"><b>Cobertura web</b><span>Mapa visual con zonas, ETA estimado y ranking de cercanía.</span></div></section></div>}

function RequestPage({setActive}:{setActive:(page:PageId)=>void}){return <div className="ucw-grid"><section className="ucw-panel ucw-span-2"><div className="ucw-section-head"><div><small>Wizard de solicitud</small><h3>Descripción & diagnóstico Hugo IA</h3></div><strong className="ucw-pill live">Paso 2/4</strong></div><div className="ucw-steps"><span className="done">1 Categoría</span><span className="current">2 Detalle</span><span>3 Dirección</span><span>4 Confirmar</span></div><div className="ucw-form-card"><label>¿Qué necesitás resolver?<textarea defaultValue="Revisar pérdida eléctrica intermitente en cocina y confirmar si hace falta cambiar toma o cableado."/></label><div className="ucw-form-row"><label>Urgencia<select defaultValue="today"><option value="today">Hoy</option><option>Programado</option><option>Emergencia</option></select></label><label>Presupuesto estimado<input defaultValue="R$ 140 - R$ 180"/></label></div><div className="ucw-upload-row"><button type="button">+ Agregar fotos</button><button type="button">🎙 Dictar con Hugo</button><button type="button">📍 Usar dirección guardada</button></div></div><button className="ucw-wide" type="button" onClick={()=>setActive('matching')}>Buscar profesionales ahora</button></section><section className="ucw-panel"><div className="ucw-hugo-card"><span>✦</span><h3>Hugo IA</h3><p>Tu pedido está claro. Sugiero categoría Electricidad, prioridad hoy y profesionales con experiencia en reparaciones residenciales.</p></div></section></div>}

function MatchingPage({setActive}:{setActive:(page:PageId)=>void}){return <div className="ucw-grid"><section className="ucw-panel ucw-span-2"><div className="ucw-section-head"><div><small>Matching algorítmico</small><h3>Buscando en vivo</h3></div><strong className="ucw-pill live">3 respuestas</strong></div><div className="ucw-matching"><RadarCard compact/><div className="ucw-pro-list">{pros.map(pro=><ProviderCard key={pro.name} pro={pro} onPick={()=>setActive('service')}/>)}</div></div></section><section className="ucw-panel"><Timeline/><button className="ucw-wide" type="button" onClick={()=>setActive('service')}>Seleccionar Roberto</button></section></div>}

function ServicePage({setActive}:{setActive:(page:PageId)=>void}){return <div className="ucw-grid"><section className="ucw-panel ucw-span-2"><div className="ucw-section-head"><div><small>Servicio activo</small><h3>Roberto Silva en camino</h3></div><strong className="ucw-pill live">ETA 12 min</strong></div><div className="ucw-service-layout"><MapMock/><div><ProviderCard pro={pros[0]} onPick={()=>setActive('messages')}/><Timeline/><div className="ucw-actions"><button type="button" onClick={()=>setActive('messages')}>Abrir chat</button><button type="button" onClick={()=>setActive('payments')}>Ver pago</button></div></div></div></section><section className="ucw-panel"><div className="ucw-section-head"><div><small>Ampliar servicio</small><h3>Tarea adicional</h3></div><strong className="ucw-pill">Opcional</strong></div><p className="ucw-muted">Permite solicitar y aprobar trabajos adicionales dentro del mismo servicio, con resumen de tiempo y costo antes de continuar.</p><button className="ucw-wide ghost" type="button">Agregar trabajo</button></section></div>}

function MessagesPage(){return <div className="ucw-grid"><section className="ucw-panel ucw-span-2"><div className="ucw-section-head"><div><small>Chat en vivo</small><h3>Roberto Silva</h3></div><strong className="ucw-pill live">Online</strong></div><div className="ucw-chat"><p><b>Roberto</b><span>Estoy saliendo desde Jurerê. Llego en aproximadamente 12 minutos.</span></p><p className="me"><b>Mariana</b><span>Perfecto. El acceso es por portería principal, departamento 402.</span></p><p><b>Hugo IA</b><span>Guardé la instrucción de acceso para el seguimiento del servicio.</span></p></div><div className="ucw-message-box"><input placeholder="Escribir mensaje"/><button type="button">Enviar</button></div></section><section className="ucw-panel"><h3>Acciones rápidas</h3><div className="ucw-upload-row vertical"><button type="button">Enviar foto</button><button type="button">Compartir ubicación</button><button type="button">Llamar</button></div></section></div>}

function PaymentsPage(){return <div className="ucw-grid"><section className="ucw-panel ucw-span-2"><div className="ucw-section-head"><div><small>Pagos</small><h3>Resumen del servicio</h3></div><strong className="ucw-pill">BRL</strong></div><div className="ucw-payment-card"><span>R$</span><div><h2>R$ 145,00</h2><p>Estimación inicial del servicio. Confirmación final antes de cerrar.</p></div></div><div className="ucw-breakdown"><p><span>Valor hora</span><b>R$ 145,00</b></p><p><span>Desplazamiento</span><b>Incluido</b></p><p><span>Trabajos adicionales</span><b>Pendiente de aprobación</b></p></div></section><section className="ucw-panel"><h3>Comprobante</h3><p className="ucw-muted">Área preparada para comprobantes, historial y conciliación, sin activar lógica financiera nueva.</p><button className="ucw-wide" type="button">Ver historial</button></section></div>}

function ProfilePage(){return <div className="ucw-grid"><section className="ucw-panel ucw-span-2"><div className="ucw-profile"><span>M</span><div><small>Cliente UGO</small><h2>Mariana Costa</h2><p>Canasvieiras · Florianópolis · WhatsApp preferido</p></div></div><div className="ucw-profile-grid"><article><b>24</b><span>servicios solicitados</span></article><article><b>4.9</b><span>calificación promedio</span></article><article><b>2</b><span>direcciones guardadas</span></article></div></section><section className="ucw-panel"><h3>Actividad reciente</h3><Timeline compact/></section></div>}

function RadarCard({compact=false}:{compact?:boolean}){return <div className={`ucw-radar-card${compact?' compact':''}`}><div className="ucw-radar"><i/><i/><i/><span>UGO</span><b className="p1">ϟ</b><b className="p2">⌁</b><b className="p3">◌</b></div><div className="ucw-radar-meta"><strong>71 profesionales activos</strong><small>Ranking por cercanía, disponibilidad y reputación.</small></div></div>}
function MapMock(){return <div className="ucw-map"><span className="home">Tu hogar</span><span className="van">12 min</span><span className="pro">Roberto</span><i/></div>}
function Timeline({compact=false}:{compact?:boolean}){return <ol className={`ucw-timeline${compact?' compact':''}`}>{activity.map(([time,title,text],idx)=><li key={time} className={idx<3?'done':'current'}><b>{time}</b><div><strong>{title}</strong>{!compact&&<span>{text}</span>}</div></li>)}</ol>}
function ProviderCard({pro,onPick}:{pro:Pro;onPick:()=>void}){return <button type="button" className="ucw-provider" onClick={onPick}><span>{pro.name.split(' ').map(x=>x[0]).join('')}</span><div><small>{pro.tag}</small><b>{pro.name}</b><em>{pro.role} · {pro.jobs}</em><strong>★ {pro.rating} · {pro.eta} · {pro.price}</strong></div><i>›</i></button>}
