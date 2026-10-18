import{useLocale,LocalizedText}from'../i18n/locale'
import React,{useMemo,useState}from'react'
import'./ugo-client-web.css'

type PageId='home'|'search'|'request'|'matching'|'active'|'activity'|'messages'|'payments'|'profile'|'help'|'settings'
type NavItem={id:PageId;label:string;icon:string;badge?:'live';count?:string}
type Pro={name:string;role:string;eta:string;km:string;rating:string;jobs:string;price:string;tag:string;avatar:string;status:string}
type RequestDraft={category:string;urgency:string;address:string;detail:string}

const nav:readonly NavItem[]=[
 {id:'home',label:'Inicio',icon:'⌂'},
 {id:'search',label:'Buscar',icon:'⌕'},
 {id:'request',label:'Solicitar',icon:'+'},
 {id:'matching',label:'Matching',icon:'◎',badge:'live'},
 {id:'active',label:'Activos',icon:'▣',count:'2'},
 {id:'activity',label:'Actividad',icon:'◷'},
 {id:'messages',label:'Mensajes',icon:'◒',count:'3'},
 {id:'payments',label:'Pagos',icon:'R$'},
 {id:'profile',label:'Perfil',icon:'◉'},
 {id:'help',label:'Ayuda',icon:'?'},
 {id:'settings',label:'Ajustes',icon:'⚙'},
]

const pros:Pro[]=[
 {name:'Roberto Silva',role:'Plomero & gasista',eta:'12 min',km:'1.8 km',rating:'4.9',jobs:'186',price:'R$ 145',tag:'Mejor coincidencia',avatar:'RS',status:'Disponible ahora'},
 {name:'Lucía Barros',role:'Reparos generales',eta:'8 min',km:'900 m',rating:'4.8',jobs:'94',price:'R$ 120',tag:'Más cerca',avatar:'LB',status:'Responde rápido'},
 {name:'Carlos Méndez',role:'Plomería y mantenimiento',eta:'14 min',km:'2.2 km',rating:'4.9',jobs:'221',price:'R$ 155',tag:'Alta reputación',avatar:'CM',status:'Agenda abierta'},
]
const services=[['Limpieza & Hogar','24 pros cerca','◌'],['Electricidad','12 pros cerca','ϟ'],['Plomería & Gas','8 pros cerca','⌁'],['Climatización','15 pros cerca','✺'],['Pintura Express','6 pros cerca','▣'],['Reparación general','9 pros cerca','◍']]
const categories=[['Todos','148','▦'],['Hogar','45','🛠'],['Plomería','14','⌁'],['Electricidad','18','ϟ'],['Gas','8','✺'],['Urgente','12','⚡']]
const timeline=[['07:42','Pedido recibido','UGO registró tu solicitud.'],['07:44','Matching en vivo','3 profesionales respondieron cerca de Canasvieiras.'],['07:47','Profesional seleccionado','Roberto Silva confirmó el servicio.'],['07:58','En camino','Se está desplazando hacia tu dirección.']]
const defaultDraft:RequestDraft={category:'Plomería y sanitarios',urgency:'Urgente',address:'Canasvieiras, Floripa',detail:'Hay una fuga en la cocina y necesitamos arreglo inmediato.'}

export function UgoClientWeb(){
 const{t}=useLocale()
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
    {active==='search'&&<SearchPage selectedProviderIndex={selectedProviderIndex} onPickProvider={selectProvider}/>} 
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
  <nav className="ucw-mobile-nav" aria-label={t('clientWeb.nav')}>{nav.slice(0,5).map(item=><button key={item.id} type="button" className={active===item.id?'active':''} onClick={()=>setActive(item.id)} aria-current={active===item.id?'page':undefined}><b>{item.icon}</b><span>{item.label}</span>{item.count&&<em>{item.count}</em>}</button>)}</nav>
 </main>
}

function Sidebar({active,setActive}:{active:PageId;setActive:(page:PageId)=>void}){
 const{t}=useLocale()
 return <aside className="ucw-sidebar" aria-label={t('clientWeb.menu')}>
  <div className="ucw-logo-row"><div className="ucw-logo-mark"><LocalizedText id="ugoWebRemaining.brand"/></div><div><strong><LocalizedText id="providerReceipt.client"/></strong><span>Floripa</span></div></div>
  <nav className="ucw-nav">{nav.map(item=><button key={item.id} type="button" className={active===item.id?'active':''} onClick={()=>setActive(item.id)} aria-current={active===item.id?'page':undefined}><b>{item.icon}</b><span>{item.label}</span>{item.badge&&<i className="ucw-live"><LocalizedText id="development.live"/></i>}{item.count&&<em>{item.count}</em>}</button>)}</nav>
 </aside>
}

function Topbar({setActive}:{title:string;setActive:(page:PageId)=>void}){
 return <header className="ucw-topbar"><div className="ucw-location"><b><LocalizedText id="clientWeb.currentLocation"/></b><span>Canasvieiras, Floripa</span></div><div className="ucw-top-actions"><button type="button" className="ucw-ghost" onClick={()=>setActive('request')}><LocalizedText id="clientWeb.request"/></button><button type="button" className="ucw-primary">Hugo</button></div></header>
}

function HomePage({setActive,requestSent,requestId,requestDraft,onSelectService}:{setActive:(page:PageId)=>void;requestSent:boolean;requestId:string;requestDraft:RequestDraft;onSelectService:(category:string)=>void}){
 return <div className="ucw-dashboard ucw-home"><section className="ucw-main"><HeroCard setActive={setActive} onSelectService={onSelectService}/><Panel kicker={<LocalizedText id="clientDemo.featuredServices"/>} title={<LocalizedText id="clientWeb.needHelp"/>}><div className="ucw-service-grid">{services.map(([name,meta,icon])=><button key={name} type="button" className="ucw-service-tile" onClick={()=>onSelectService(name.split('&')[0].trim())}><i aria-hidden="true">{icon}</i><div><strong>{name}</strong><small>{meta}</small></div><span aria-hidden="true">→</span></button>)}</div></Panel></section><RightRail requestSent={requestSent} requestId={requestId} requestDraft={requestDraft}/></div>
}

function HeroCard({setActive,onSelectService}:{setActive:(page:PageId)=>void;onSelectService:(category:string)=>void}){
 const{t}=useLocale()
 return <section className="ucw-home-hero" aria-label={t('clientWeb.mainCard')}><div className="ucw-hello"><span className="ucw-sos"><LocalizedText id="clientWeb.sos"/></span><small><LocalizedText id="clientWeb.localNetwork"/></small></div><h1><LocalizedText id="clientWeb.needHelp"/></h1><p><LocalizedText id="clientWeb.findPro"/></p><div className="ucw-hero-actions"><button type="button" className="ucw-primary" onClick={()=>setActive('request')}><LocalizedText id="clientWeb.requestService"/></button><button type="button" className="ucw-ghost" onClick={()=>onSelectService('Plomería y sanitarios')}><LocalizedText id="clientWeb.urgentPlumbing"/></button></div></section>
}

function RightRail({requestSent,requestId,requestDraft}:{requestSent:boolean;requestId:string;requestDraft:RequestDraft}){
 const{t}=useLocale()
 return <aside className="ucw-right"><div className="ucw-protection"><b><LocalizedText id="clientWeb.protectionActive"/></b><span><LocalizedText id="clientWeb.verifiedProfiles"/></span></div><div className="ucw-mini-panel"><small><LocalizedText id="clientWeb.orderStatus"/></small><strong>{requestSent?t('clientWeb.requestSubmitted',{id:requestId}):t('clientWeb.noActiveRequest')}</strong><span>{requestDraft.category}</span></div><div className="ucw-mini-panel"><small><LocalizedText id="clientWeb.nextStep"/></small><strong>{requestSent?t('clientWeb.liveMatchingTitle'):t('clientWeb.selectService')}</strong><span>{requestSent?t('clientWeb.respondingNearby',{count:2}):t('clientWeb.helpChoose')}</span></div></aside>
}

function SearchPage({selectedProviderIndex,onPickProvider}:{selectedProviderIndex:number;onPickProvider:(idx:number)=>void}){
 return <div className="ucw-dashboard"><section className="ucw-filter"><Panel kicker={<LocalizedText id="clientDemo.quickSearch"/>} title={<LocalizedText id="clientWeb.categories"/>}><div className="ucw-chip-row">{categories.map(([name,count,icon],idx)=><button type="button" key={name} className={`ucw-chip ${idx===0?'active':''}`} aria-pressed={idx===0}><span aria-hidden="true">{icon}</span>{name}<em>{count}</em></button>)}</div></Panel></section><section className="ucw-main"><Panel kicker={<LocalizedText id="clientDemo.professionalsNear"/>} title={<LocalizedText id="clientWeb.matches"/>}><div className="ucw-result-list">{pros.map((pro,idx)=><ProviderCard key={pro.name} pro={pro} onPick={()=>onPickProvider(idx)} compact={idx===selectedProviderIndex} rank={idx+1}/>)}</div></Panel></section></div>
}

function RequestPage({requestDraft,setRequestDraft,onSubmit}:{requestDraft:RequestDraft;setRequestDraft:(value:RequestDraft)=>void;onSubmit:()=>void}){
 return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker={<LocalizedText id="clientDemo.createRequest"/>} title={<LocalizedText id="clientWeb.describeNeed"/>}><div className="ucw-form"><label><span><LocalizedText id="screen.admin_tariffs.6"/></span><select value={requestDraft.category} onChange={e=>setRequestDraft({...requestDraft,category:e.target.value})}><option><LocalizedText id="clientWeb.plumbing"/></option><option><LocalizedText id="clientWeb.electricity"/></option><option><LocalizedText id="clientWeb.homeMaintenance"/></option><option><LocalizedText id="clientWeb.gasClimate"/></option></select></label><label><span><LocalizedText id="clientWeb.urgency"/></span><select value={requestDraft.urgency} onChange={e=>setRequestDraft({...requestDraft,urgency:e.target.value})}><option><LocalizedText id="screen.opportunities.4"/></option><option><LocalizedText id="flow.when.today"/></option><option><LocalizedText id="clientWeb.nextWeek"/></option></select></label><label><span><LocalizedText id="screen.location.17"/></span><input value={requestDraft.address} onChange={e=>setRequestDraft({...requestDraft,address:e.target.value})}/></label><label><span><LocalizedText id="clientWeb.details"/></span><textarea rows={4} value={requestDraft.detail} onChange={e=>setRequestDraft({...requestDraft,detail:e.target.value})}/></label><div className="ucw-form-actions"><button type="button" className="ucw-ghost"><LocalizedText id="clientWeb.saveDraft"/></button><button type="button" className="ucw-primary" onClick={onSubmit}><LocalizedText id="clientWeb.requestService"/></button></div></div></Panel></section><aside className="ucw-right"><div className="ucw-mini-panel"><small><LocalizedText id="clientWeb.estimatedTime"/></small><strong>12–18 min</strong><span><LocalizedText id="clientWeb.firstProvider"/></span></div><div className="ucw-mini-panel"><small><LocalizedText id="clientWeb.price"/></small><strong>Desde R$ 120</strong><span><LocalizedText id="clientWeb.noHiddenCosts"/></span></div></aside></div>
}

function MatchingPage({requestId,requestDraft,selectedProviderIndex,onPickProvider,setActive}:{requestId:string;requestDraft:RequestDraft;selectedProviderIndex:number;onPickProvider:(idx:number)=>void;setActive:(page:PageId)=>void}){
 const selected=pros[selectedProviderIndex]||pros[0]
 return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker={`Solicitud ${requestId}`} title={<LocalizedText id="clientWeb.liveMatchingTitle"/>}><div className="ucw-match-wrap"><div className="ucw-match-card"><strong>{requestDraft.category}</strong><span>{requestDraft.address}</span><small>{requestDraft.urgency}</small></div><div className="ucw-result-list">{pros.map((pro,idx)=><ProviderCard key={pro.name} pro={pro} onPick={()=>onPickProvider(idx)} compact={idx===selectedProviderIndex} rank={idx+1}/>)}</div></div></Panel></section><aside className="ucw-right"><div className="ucw-mini-panel"><small><LocalizedText id="clientWeb.suggestedProvider"/></small><strong>{selected.name}</strong><span>{selected.role}</span></div><div className="ucw-mini-panel"><small><LocalizedText id="clientWeb.flow"/></small><strong><LocalizedText id="clientWeb.confirm60"/></strong><button type="button" className="ucw-primary" style={{marginTop:12,width:'100%'}} onClick={()=>setActive('active')}><LocalizedText id="clientWeb.confirmWork"/></button></div></aside></div>
}

function ActiveServicePage({setActive,requestId,selectedProvider,requestDraft}:{setActive:(page:PageId)=>void;requestId:string;selectedProvider:Pro;requestDraft:RequestDraft}){
 return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker={<LocalizedText id="clientWeb.activeKicker" params={{id:requestId}}/>} title={<LocalizedText id="clientWeb.serviceAssignedTitle"/>}><div className="ucw-active-card"><div className="ucw-active-top"><div className="ucw-result-avatar">{selectedProvider.avatar}</div><div><strong>{selectedProvider.name}</strong><small>{selectedProvider.role}</small></div><span className="ucw-badge success"><LocalizedText id="clientWeb.onTheWay"/></span></div><div className="ucw-track"><span style={{width:'68%'}} /></div><ul className="ucw-list"><li><LocalizedText id="clientWeb.comingFrom"/> {selectedProvider.km}.</li><li>{requestDraft.category} · {requestDraft.address}</li><li><LocalizedText id="clientWeb.liveChat"/></li></ul><div className="ucw-form-actions"><button type="button" className="ucw-primary" onClick={()=>setActive('messages')}><LocalizedText id="clientMatch.openChat"/></button><button type="button" className="ucw-ghost" onClick={()=>setActive('activity')}><LocalizedText id="clientWeb.viewActivity"/></button></div></div></Panel></section><aside className="ucw-right"><div className="ucw-mini-panel"><small><LocalizedText id="clientWeb.trafficEta"/></small><strong>{selectedProvider.eta}</strong><span><LocalizedText id="clientWeb.trafficEstimate"/></span></div><div className="ucw-mini-panel"><small><LocalizedText id="clientWeb.protection"/></small><strong><LocalizedText id="clientWeb.ugoInsurance"/></strong><span><LocalizedText id="clientWeb.paymentTracking"/></span></div></aside></div>
}

function ActivityPage(){
 return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker={<LocalizedText id="clientWeb.recentHistory"/>} title={<LocalizedText id="clientWeb.recentHistory"/>}><div className="ucw-timeline">{timeline.map(([time,title,text],idx)=><div key={time} className={`ucw-time-item ${idx<3?'done':''}`}><span>{time}</span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div></Panel></section></div>
}

function MessagesPage(){
 const{t}=useLocale()
 return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker={<LocalizedText id="clientDemo.liveChat"/>} title={<LocalizedText id="clientDemo.providerOnWay" params={{name:"Roberto Silva"}}/>}><div className="ucw-chat-layout"><div className="ucw-chat-bubble me"><LocalizedText id="clientDemo.voiceRequest"/></div><div className="ucw-chat-bubble they"><LocalizedText id="clientDemo.providerReply"/></div><div className="ucw-chat-bubble they"><LocalizedText id="clientDemo.etaReply"/></div><div className="ucw-chat-input-row"><input aria-label={t("clientWeb.writeMessage")} placeholder={t("clientWeb.messagePlaceholder")}/><button type="button" className="ucw-primary"><LocalizedText id="chat.send"/></button></div></div></Panel></section></div>
}

function PaymentsPage(){
 return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker={<LocalizedText id="clientWeb.paymentManagement"/>} title={<LocalizedText id="clientWeb.wallet"/>}><div className="ucw-money-grid"><article><span><LocalizedText id="clientWeb.availableBalance"/></span><strong>R$ 420,00</strong></article><article><span><LocalizedText id="clientWeb.pendingCharges"/></span><strong>R$ 145,00</strong></article><article><span><LocalizedText id="clientWeb.securePayment"/></span><strong>Visa · 2025</strong></article></div></Panel></section></div>
}

function ProfilePage({setActive}:{setActive:(page:PageId)=>void}){
 return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker={<LocalizedText id="clientWeb.customerLabel"/>} title="Mariana Costa"><div className="ucw-profile-card"><div className="ucw-result-avatar lg">MC</div><div><strong><LocalizedText id="providerProfile.verified"/></strong><span><LocalizedText id="clientDemo.customerSince" params={{year:2024,count:12}}/></span></div></div><div className="ucw-meta-grid"><div><small><LocalizedText id="screen.location.17"/></small><strong>Canasvieiras, Floripa</strong></div><div><small><LocalizedText id="clientOnboarding.preferences"/></small><strong><LocalizedText id="clientWeb.urgentAttention"/></strong></div></div><button type="button" className="ucw-primary" style={{marginTop:14}} onClick={()=>setActive('settings')}><LocalizedText id="clientWeb.configureNotifications"/></button></Panel></section></div>
}

function SupportPage({title}:{title:string}){
 return <div className="ucw-dashboard"><section className="ucw-main"><Panel kicker="UGO Cliente" title={title}><p className="ucw-muted"><LocalizedText id="clientWeb.supportCenter"/></p><div className="ucw-support-list"><button type="button" className="ucw-ghost"><LocalizedText id="clientWeb.chatSupport"/></button><button type="button" className="ucw-ghost"><LocalizedText id="clientWeb.warrantyRefund"/></button><button type="button" className="ucw-ghost"><LocalizedText id="clientWeb.faq"/></button></div></Panel></section></div>
}

function Panel({kicker,title,action,onAction,children}:{kicker:React.ReactNode;title:React.ReactNode;action?:React.ReactNode;onAction?:()=>void;children:React.ReactNode}){
 return <section className="ucw-card"><header className="ucw-card-head"><div><small>{kicker}</small><h3>{title}</h3></div>{action&&<button type="button" className="ucw-ghost small" onClick={onAction}>{action}</button>}</header>{children}</section>
}

function ProviderCard({pro,onPick,compact=false,rank}:{pro:Pro;onPick:()=>void;compact?:boolean;rank?:number}){
 const{t}=useLocale()
 return <article className={`ucw-provider-card${compact?' compact':''}`}>
  <div className="ucw-result-avatar">{pro.avatar}</div>
  <div className="ucw-provider-main"><small>#{rank}</small><strong>{pro.name}</strong><span>{pro.role}</span><div className="ucw-provider-meta"><b>{pro.rating}</b><em>{pro.jobs} <LocalizedText id="screen.earnings.2"/></em><small>{pro.status}</small></div></div>
  <div className="ucw-provider-side"><strong>{pro.price}</strong><span>{pro.eta}</span><button type="button" className="ucw-primary" onClick={onPick}>{compact?t("uiCopy.short50"):t("uiCopy.short51")}</button></div>
 </article>
}
