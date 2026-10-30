import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState}from'react'
import{getRoleSupabase,type UgoRole}from'../lib/roleSupabase'
import{supabase as adminSupabase}from'../lib/supabase'
import{extendedMessages}from'./translations/extended'
import{coreMessages}from'./translations/core'
import{faxinaMessages}from'./translations/faxina'

export type UgoLocale='pt-BR'|'es'|'en'
type LocaleContextValue={locale:UgoLocale;setLocale:(locale:UgoLocale)=>void;t:(key:string,params?:Record<string,string|number>)=>string}
const STORAGE_KEY='ugo.locale'
const guestLocaleKey=()=>STORAGE_KEY+'.guest.'+(roleFromLocation()||'unknown')
const accountLocaleKey=(role:string,userId:string)=>STORAGE_KEY+'.'+role+'.'+userId
const SUPPORTED:UgoLocale[]=['pt-BR','es','en']
const messages:Record<UgoLocale,Record<string,string>>={
 'pt-BR':{'language.label':'Idioma','language.portuguese':'Português (Brasil)','language.spanish':'Espanhol','language.english':'Inglês','language.saved':'Idioma atualizado.','language.saveError':'Idioma salvo neste dispositivo; não foi possível sincronizar com a conta.','language.loading':'Carregando idioma…'},
 es:{'language.label':'Idioma','language.portuguese':'Portugués (Brasil)','language.spanish':'Español','language.english':'Inglés','language.saved':'Idioma actualizado.','language.saveError':'Idioma guardado en este dispositivo; no se pudo sincronizar con la cuenta.','language.loading':'Cargando idioma…'},
 en:{'language.label':'Language','language.portuguese':'Portuguese (Brazil)','language.spanish':'Spanish','language.english':'English','language.saved':'Language updated.','language.saveError':'Language saved on this device; account sync failed.','language.loading':'Loading language…'}
}
Object.assign(messages["pt-BR"],{"home.greeting":"Olá, {name}.","home.question":"Do que você precisa hoje?","home.request":"Solicitar um serviço","home.requestHelp":"Conte o que precisa e encontramos um profissional.","home.live":"Mapa ao vivo","home.near":"Profissionais perto da sua região","home.tracking":"Acompanhamento do profissional","home.assigned":"Profissional atribuído","home.enroute":"A caminho","provider.welcome":"Olá, {name}","provider.rating":"Avaliação {rating} de 5 · {zone}","provider.work":"Você está no radar UGO","provider.ready":"PRONTO PARA TRABALHAR","provider.refresh":"Atualizar agora","provider.available":"Você está disponível e com localização atualizada. A UGO avisa quando chegar um pedido compatível.","provider.title":"No radar UGO","provider.offline":"Você está offline","provider.offlineHelp":"Ative o modo Online para receber pedidos compatíveis com sua categoria."})
Object.assign(messages["es"],{"home.greeting":"Hola, {name}.","home.question":"¿Qué necesitás hoy?","home.request":"Pedir un servicio","home.requestHelp":"Contanos qué necesitás y encontramos un profesional.","home.live":"Mapa en vivo","home.near":"Profesionales cerca de tu zona","home.tracking":"Seguimiento de tu profesional","home.assigned":"Profesional asignado","home.enroute":"En camino","provider.welcome":"Hola, {name}","provider.rating":"Calificación {rating} de 5 · {zone}","provider.work":"Estás en el radar de UGO","provider.ready":"LISTO PARA TRABAJAR","provider.refresh":"Actualizar ahora","provider.available":"Estás disponible y con ubicación vigente. UGO te avisa cuando llegue un pedido compatible.","provider.title":"En el radar de UGO","provider.offline":"Estás Offline","provider.offlineHelp":"Activá Online para recibir pedidos compatibles con tu categoría."})
Object.assign(messages["en"],{"home.greeting":"Hello, {name}.","home.question":"What do you need today?","home.request":"Request a service","home.requestHelp":"Tell us what you need and we'll find a professional.","home.live":"Live map","home.near":"Professionals near your area","home.tracking":"Track your professional","home.assigned":"Professional assigned","home.enroute":"On the way","provider.welcome":"Hello, {name}","provider.rating":"Rating {rating} out of 5 · {zone}","provider.work":"You're on the UGO radar","provider.ready":"READY TO WORK","provider.refresh":"Refresh now","provider.available":"You're available with an up-to-date location. UGO will notify you of compatible requests.","provider.title":"On the UGO radar","provider.offline":"You're offline","provider.offlineHelp":"Go online to receive requests matching your category."})
Object.assign(messages["pt-BR"],{"notification.proveedor_asignado":"Profissional confirmado","notification.proveedor_en_camino":"Seu profissional está a caminho","notification.proveedor_llego":"Seu profissional chegou","notification.servicio_iniciado":"Serviço iniciado","notification.servicio_completado":"Serviço concluído","notification.servicio_cancelado":"Serviço cancelado","notification.nueva_oferta":"Novo pedido disponível","notification.trabajo_asignado":"Novo serviço atribuído","notification.chat_mensaje":"Nova mensagem","notification.open":"Ver pedido","notification.empty":"Nenhuma notificação ainda.","notification.heading":"Notificações UGO"})
Object.assign(messages["es"],{"notification.proveedor_asignado":"Profesional asignado","notification.proveedor_en_camino":"Tu profesional está en camino","notification.proveedor_llego":"Llegó tu profesional","notification.servicio_iniciado":"Servicio iniciado","notification.servicio_completado":"Servicio completado","notification.servicio_cancelado":"Servicio cancelado","notification.nueva_oferta":"Nuevo pedido disponible","notification.trabajo_asignado":"Nuevo trabajo asignado","notification.chat_mensaje":"Nuevo mensaje","notification.open":"Ver pedido","notification.empty":"Sin notificaciones todavía.","notification.heading":"Notificaciones UGO"})
Object.assign(messages["en"],{"notification.proveedor_asignado":"Professional assigned","notification.proveedor_en_camino":"Your professional is on the way","notification.proveedor_llego":"Your professional has arrived","notification.servicio_iniciado":"Service started","notification.servicio_completado":"Service completed","notification.servicio_cancelado":"Service canceled","notification.nueva_oferta":"New request available","notification.trabajo_asignado":"New job assigned","notification.chat_mensaje":"New message","notification.open":"View order","notification.empty":"No notifications yet.","notification.heading":"UGO notifications"})
Object.assign(messages["pt-BR"],{"nav.home":"Início","nav.orders":"Pedidos","nav.active":"Trabalho ativo","nav.jobs":"Meus trabalhos","nav.history":"Histórico","nav.earnings":"Ganhos","nav.profile":"Perfil","nav.help":"Ajuda e suporte","nav.goOnline":"Offline · começar a receber","nav.goOffline":"Online · parar de receber","nav.available":"Disponível","nav.unavailable":"Offline"})
Object.assign(messages["es"],{"nav.home":"Inicio","nav.orders":"Pedidos","nav.active":"Trabajo activo","nav.jobs":"Mis trabajos","nav.history":"Historial","nav.earnings":"Ganancias","nav.profile":"Perfil","nav.help":"Ayuda y disputa","nav.goOnline":"Offline · empezar a recibir","nav.goOffline":"Online · dejar de recibir","nav.available":"Disponible","nav.unavailable":"Fuera de línea"})
Object.assign(messages["en"],{"nav.home":"Home","nav.orders":"Requests","nav.active":"Active job","nav.jobs":"My jobs","nav.history":"History","nav.earnings":"Earnings","nav.profile":"Profile","nav.help":"Help and support","nav.goOnline":"Offline · start receiving","nav.goOffline":"Online · stop receiving","nav.available":"Available","nav.unavailable":"Offline"})
Object.assign(messages["pt-BR"],{"client.menu":"Menu UGO Cliente","client.menuTitle":"Cliente","client.account":"Perfil, endereços e preferências","client.request":"Solicitar serviço","client.categories":"Categorias","client.addresses":"Meus endereços","client.payment":"Formas de pagamento","client.notifications":"Notificações","client.logout":"Sair","client.activity":"Atividade"})
Object.assign(messages["pt-BR"],{"clientMenu.assistant":"Hugo / Assistente IA","clientMenu.settings":"Configurações","clientMenu.close":"Fechar menu","clientMenu.customer":"Cliente","clientMenu.accountDefault":"Cliente UGO","clientMenu.tagline":"Um pedido. Um profissional. Sem complicação."})
Object.assign(messages["es"],{"client.menu":"Menú UGO Cliente","client.menuTitle":"Cliente","client.account":"Perfil, direcciones y preferencias","client.request":"Pedir servicio","client.categories":"Categorías","client.addresses":"Mis direcciones","client.payment":"Medios de pago","client.notifications":"Notificaciones","client.logout":"Cerrar sesión","client.activity":"Actividad"})
Object.assign(messages["es"],{"clientMenu.assistant":"Hugo / Asistente IA","clientMenu.settings":"Configuración","clientMenu.close":"Cerrar menú","clientMenu.customer":"Cliente","clientMenu.accountDefault":"Cliente UGO","clientMenu.tagline":"Un pedido. Un profesional. Sin vueltas."})
Object.assign(messages["en"],{"client.menu":"UGO Client menu","client.menuTitle":"Client","client.account":"Profile, addresses and preferences","client.request":"Request service","client.categories":"Categories","client.addresses":"My addresses","client.payment":"Payment methods","client.notifications":"Notifications","client.logout":"Sign out","client.activity":"Activity"})
Object.assign(messages["en"],{"clientMenu.assistant":"Hugo / AI Assistant","clientMenu.settings":"Settings","clientMenu.close":"Close menu","clientMenu.customer":"Client","clientMenu.accountDefault":"UGO Client","clientMenu.tagline":"One request. One professional. No hassle."})
Object.assign(messages["pt-BR"],{"agenda.title":"Meus trabalhos","agenda.description":"Cada pedido mantém o identificador, chat, estados, evidências e histórico.","agenda.history":"Ver histórico","agenda.manage":"Gerenciar pedido","agenda.loading":"Carregando agenda…","agenda.error":"Não foi possível carregar a agenda","agenda.retry":"Tentar novamente","agenda.empty":"Você ainda não tem trabalhos atribuídos","agenda.emptyDetail":"Ao aceitar um pedido imediato ou agendado, ele aparecerá aqui.","agenda.opportunities":"Ver oportunidades","agenda.now":"AGORA","agenda.today":"HOJE","agenda.upcoming":"PRÓXIMOS","agenda.current":"SERVIÇO ATIVO","agenda.next":"PRÓXIMO","chat.close":"Fechar chat","chat.active":"SERVIÇO ATIVO","chat.activeMany":"PEDIDOS ATIVOS","chat.with":"Conversa com {name}","payment.choose":"Como deseja pagar?","payment.cash":"Dinheiro","payment.pix":"Pix","payment.retry":"Tentar novamente","payment.copy":"Copiar código Pix","payment.scan":"Escaneie ou copie o código Pix","payment.service":"SERVIÇO","admin.global":"Controle global do UGO","admin.summary":"Governança, segurança, auditoria e integrações da plataforma.","admin.sync":"Sincronizar","admin.syncing":"Sincronizando…","admin.nav":"Navegação Super Admin"})
Object.assign(messages["es"],{"agenda.title":"Mis trabajos","agenda.description":"Cada pedido conserva su identificador, chat, estados, evidencias e historial.","agenda.history":"Ver historial","agenda.manage":"Gestionar pedido","agenda.loading":"Cargando agenda…","agenda.error":"No pudimos cargar tu agenda","agenda.retry":"Reintentar","agenda.empty":"No tenés trabajos asignados","agenda.emptyDetail":"Cuando aceptes un pedido inmediato o programado, aparecerá aquí.","agenda.opportunities":"Ver oportunidades","agenda.now":"AHORA","agenda.today":"HOY","agenda.upcoming":"PRÓXIMOS","agenda.current":"SERVICIO ACTIVO","agenda.next":"SIGUIENTE","chat.close":"Cerrar chat","chat.active":"SERVICIO ACTIVO","chat.activeMany":"PEDIDOS ACTIVOS","chat.with":"Chat con {name}","payment.choose":"¿Cómo querés pagar?","payment.cash":"Efectivo","payment.pix":"Pix","payment.retry":"Reintentar","payment.copy":"Copiar código Pix","payment.scan":"Escaneá o copiá el código Pix","payment.service":"SERVICIO","admin.global":"Control global de UGO","admin.summary":"Gobierno, seguridad, auditoría e integraciones de plataforma.","admin.sync":"Sincronizar","admin.syncing":"Sincronizando…","admin.nav":"Navegación Super Admin"})
Object.assign(messages["en"],{"agenda.title":"My jobs","agenda.description":"Every request keeps its identifier, chat, status, evidence and history.","agenda.history":"View history","agenda.manage":"Manage request","agenda.loading":"Loading schedule…","agenda.error":"Could not load your schedule","agenda.retry":"Retry","agenda.empty":"No jobs assigned yet","agenda.emptyDetail":"Accepted immediate or scheduled jobs will appear here.","agenda.opportunities":"View opportunities","agenda.now":"NOW","agenda.today":"TODAY","agenda.upcoming":"UPCOMING","agenda.current":"ACTIVE SERVICE","agenda.next":"NEXT","chat.close":"Close chat","chat.active":"ACTIVE SERVICE","chat.activeMany":"ACTIVE REQUESTS","chat.with":"Chat with {name}","payment.choose":"How would you like to pay?","payment.cash":"Cash","payment.pix":"Pix","payment.retry":"Retry","payment.copy":"Copy Pix code","payment.scan":"Scan or copy the Pix code","payment.service":"SERVICE","admin.global":"UGO global control","admin.summary":"Platform governance, security, auditing and integrations.","admin.sync":"Sync","admin.syncing":"Syncing…","admin.nav":"Super Admin navigation"})
Object.assign(messages["pt-BR"],{"admin.navHome":"Início","admin.navOperations":"Operações","admin.navPeople":"Pessoas","admin.navFinance":"Finanças","admin.navSettings":"Configurações","admin.navAdmin":"Navegação Admin","admin.refresh":"Atualizar","admin.refreshing":"Atualizando…","admin.tab.command":"Centro de comando","admin.tab.autonomy":"Empresa Autônoma","admin.tab.flags":"Funcionalidades","admin.tab.audit":"Registro de auditoria","admin.tab.integrations":"Integrações","admin.tab.metrics":"Métricas globais","admin.tab.roles":"Papéis e permissões","admin.tab.ip":"Legal / Proteção IP"})
Object.assign(messages["es"],{"admin.navHome":"Inicio","admin.navOperations":"Operaciones","admin.navPeople":"Personas","admin.navFinance":"Finanzas","admin.navSettings":"Configuración","admin.navAdmin":"Navegación Admin","admin.refresh":"Actualizar","admin.refreshing":"Actualizando…","admin.tab.command":"Centro de control","admin.tab.autonomy":"Empresa Autónoma","admin.tab.flags":"Funcionalidades","admin.tab.audit":"Registro de auditoría","admin.tab.integrations":"Integraciones","admin.tab.metrics":"Métricas globales","admin.tab.roles":"Roles y permisos","admin.tab.ip":"Legal / Protección IP"})
Object.assign(messages["en"],{"admin.navHome":"Home","admin.navOperations":"Operations","admin.navPeople":"People","admin.navFinance":"Finance","admin.navSettings":"Settings","admin.navAdmin":"Admin navigation","admin.refresh":"Refresh","admin.refreshing":"Refreshing…","admin.tab.command":"Command Center","admin.tab.autonomy":"Autonomous company","admin.tab.flags":"Feature Flags","admin.tab.audit":"Audit log","admin.tab.integrations":"Integrations","admin.tab.metrics":"Global metrics","admin.tab.roles":"Roles and permissions","admin.tab.ip":"Legal / IP protection"})
Object.assign(messages["pt-BR"],{"status.buscando":"Buscando profissional","status.ofrecido":"Oferta enviada","status.asignado":"Profissional atribuído","status.en_camino":"A caminho","status.llegado":"No local","status.en_progreso":"Serviço em andamento","status.esperando_aprobacion":"Aguardando aprovação","status.completado":"Concluído","status.cancelado":"Cancelado","status.disputado":"Em disputa","status.pago_pendiente":"Pagamento pendente"})
Object.assign(messages["es"],{"status.buscando":"Buscando profesional","status.ofrecido":"Oferta enviada","status.asignado":"Profesional asignado","status.en_camino":"En camino","status.llegado":"En el lugar","status.en_progreso":"Servicio en curso","status.esperando_aprobacion":"Esperando aprobación","status.completado":"Completado","status.cancelado":"Cancelado","status.disputado":"En disputa","status.pago_pendiente":"Pago pendiente"})
Object.assign(messages["en"],{"status.buscando":"Searching for a professional","status.ofrecido":"Offer sent","status.asignado":"Professional assigned","status.en_camino":"On the way","status.llegado":"Arrived","status.en_progreso":"Service in progress","status.esperando_aprobacion":"Awaiting approval","status.completado":"Completed","status.cancelado":"Canceled","status.disputado":"Disputed","status.pago_pendiente":"Payment pending"})
Object.assign(messages["pt-BR"],{"admin.dashboard.title":"Monitoramento em tempo real do UGO","admin.dashboard.eyebrow":"CENTRO DE CONTROLE OPERACIONAL","admin.dashboard.sync":"Sincronizando dados reais…","admin.dashboard.live":"Ao vivo","admin.dashboard.connecting":"Conectando…","admin.dashboard.resync":"Ressincronizando","admin.dashboard.operation":"Ver operação","admin.dashboard.kpis":"Indicadores operacionais","admin.dashboard.active":"Serviços ativos agora","admin.dashboard.providers":"Profissionais online","admin.dashboard.users":"Usuários ativos","admin.dashboard.completed":"Concluídos hoje","admin.dashboard.pending":"Pendências","admin.dashboard.decision":"CENTRO DE DECISÕES","admin.dashboard.immediate":"Atenção imediata","admin.dashboard.map":"Mapa ao vivo","admin.dashboard.state":"Estado dos serviços"})
Object.assign(messages["es"],{"admin.dashboard.title":"Monitoreo en tiempo real de UGO","admin.dashboard.eyebrow":"CENTRO DE CONTROL OPERACIONAL","admin.dashboard.sync":"Sincronizando datos reales…","admin.dashboard.live":"En vivo","admin.dashboard.connecting":"Conectando…","admin.dashboard.resync":"Resincronizando","admin.dashboard.operation":"Ver operación","admin.dashboard.kpis":"Indicadores operativos","admin.dashboard.active":"Servicios activos ahora","admin.dashboard.providers":"Proveedores online","admin.dashboard.users":"Usuarios activos","admin.dashboard.completed":"Completados hoy","admin.dashboard.pending":"Atención pendiente","admin.dashboard.decision":"CENTRO DE DECISIONES","admin.dashboard.immediate":"Atención inmediata","admin.dashboard.map":"Mapa en vivo","admin.dashboard.state":"Estado de servicios"})
Object.assign(messages["en"],{"admin.dashboard.title":"UGO real-time monitoring","admin.dashboard.eyebrow":"OPERATIONS CONTROL CENTER","admin.dashboard.sync":"Syncing live data…","admin.dashboard.live":"Live","admin.dashboard.connecting":"Connecting…","admin.dashboard.resync":"Resyncing","admin.dashboard.operation":"View operations","admin.dashboard.kpis":"Operational indicators","admin.dashboard.active":"Active services now","admin.dashboard.providers":"Providers online","admin.dashboard.users":"Active users","admin.dashboard.completed":"Completed today","admin.dashboard.pending":"Needs attention","admin.dashboard.decision":"DECISION CENTER","admin.dashboard.immediate":"Immediate attention","admin.dashboard.map":"Live map","admin.dashboard.state":"Service status"})
for(const locale of ['pt-BR','es','en'] as const)Object.assign(messages[locale],coreMessages[locale])
for(const locale of ['pt-BR','es','en'] as const)Object.assign(messages[locale],extendedMessages[locale])
for(const locale of ['pt-BR','es','en'] as const)Object.assign(messages[locale],faxinaMessages[locale])
function translate(locale:UgoLocale,key:string,params?:Record<string,string|number>):string{
 const template=messages[locale][key]??messages['pt-BR'][key]??key
 return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,(match,name:string)=>{
  const value=params?.[name]
  return value===undefined?match:typeof value==='number'?new Intl.NumberFormat(locale).format(value):value
 })
}
const LocaleContext=createContext<LocaleContextValue|null>(null)
function isLocale(value:unknown):value is UgoLocale{return typeof value==='string'&&SUPPORTED.includes(value as UgoLocale)}
function roleFromLocation():UgoRole|'admin'|null{
 const app=new URLSearchParams(window.location.search).get('app')
 if(app==='client'||app==='client-web'||app==='web-client'||app==='stitch-client')return'client'
 if(app==='provider'||app==='provider-web'||app==='web-provider'||app==='recruit')return'provider'
 if(app==='admin'||app==='superadmin')return'admin'
 return null
}
function authClient(){const role=roleFromLocation();return role==='client'||role==='provider'?getRoleSupabase(role):role==='admin'?adminSupabase:null}
function initialLocale():UgoLocale{try{const stored=window.localStorage.getItem(guestLocaleKey());if(isLocale(stored))return stored}catch{}return'pt-BR'}

export function LocaleProvider({children}:{children:React.ReactNode}){
 const[locale,setLocaleState]=useState<UgoLocale>(initialLocale)
 const pending=useRef<UgoLocale|null>(null)
 const role=roleFromLocation()
 const accountKey=useRef<string|null>(null)
 const revision=useRef(0)
 const syncQueue=useRef<Promise<void>>(Promise.resolve())
 useEffect(()=>{document.documentElement.lang=locale},[locale])
 useEffect(()=>{
  const client=authClient()
  if(!client)return
  let alive=true
  const apply=(session:{user:{id:string;user_metadata?:Record<string,unknown>}}|null)=>{
   if(!alive)return
   if(!session){accountKey.current=null;pending.current=null;++revision.current;setLocaleState(initialLocale());return}
   const key=accountLocaleKey(role||'unknown',session.user.id)
   if(accountKey.current!==key)accountKey.current=key
   // Local changes made during async metadata updates take priority over token refresh events.
   if(pending.current)return
   let local:unknown
   try{local=window.localStorage.getItem(key)}catch{}
   const metadata=session.user.user_metadata?.preferred_language
   const remoteTime=Number(session.user.user_metadata?.preferred_language_updated_at)||0
   let localTime=0
   try{localTime=Number(window.localStorage.getItem(key+'.updatedAt'))||0}catch{}
   const chosen=isLocale(metadata)&&remoteTime>=localTime?metadata:isLocale(local)?local:isLocale(metadata)?metadata:initialLocale()
   if(role==='client'&&!isLocale(local)&&!isLocale(metadata)){
    const selectionRevision=revision.current
    // Defer REST access until outside Supabase's synchronous auth callback.
    void Promise.resolve().then(async()=>{
     const{data,error}=await client.from('perfiles_cliente').select('idioma_preferido').eq('usuario_id',session.user.id).maybeSingle()
     if(!alive||error||accountKey.current!==key||pending.current||revision.current!==selectionRevision||!isLocale(data?.idioma_preferido))return
     setLocaleState(data.idioma_preferido)
     try{window.localStorage.setItem(key,data.idioma_preferido);window.localStorage.setItem(guestLocaleKey(),data.idioma_preferido)}catch{}
    }).catch(()=>{})
   }
   setLocaleState(chosen)
   try{window.localStorage.setItem(key,chosen);window.localStorage.setItem(key+'.updatedAt',String(Math.max(remoteTime,localTime)));window.localStorage.setItem(guestLocaleKey(),chosen)}catch{}
  }
  const startedRevision=revision.current
  void client.auth.getSession().then(({data,error})=>{if(!error&&revision.current===startedRevision)apply(data.session)}).catch(()=>{})
  const{data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
   if(!alive)return
   if(event==='SIGNED_OUT'){apply(null);return}
   if(['SIGNED_IN','USER_UPDATED','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event))apply(session)
  })
  return()=>{alive=false;subscription.unsubscribe()}
 },[role])
 const setLocale=useCallback((next:UgoLocale)=>{
  if(!isLocale(next))return
  setLocaleState(next)
  pending.current=next
  const seq=++revision.current
  const key=accountKey.current
  const selectedAt=Date.now()
  try{window.localStorage.setItem(key||guestLocaleKey(),next);window.localStorage.setItem(guestLocaleKey(),next);if(key)window.localStorage.setItem(key+'.updatedAt',String(selectedAt))}catch{}
  const client=authClient()
  if(!client){pending.current=null;return}
  syncQueue.current=syncQueue.current.then(async()=>{
   try{
    const{data,error}=await client.auth.getSession()
    if(error||!data.session||seq!==revision.current)return
    const actualKey=accountLocaleKey(role||'unknown',data.session.user.id)
    if(key&&key!==actualKey)return
    accountKey.current=actualKey
    try{window.localStorage.setItem(actualKey,next);window.localStorage.setItem(actualKey+'.updatedAt',String(selectedAt))}catch{}
    const{error:updateError}=await client.auth.updateUser({data:{preferred_language:next,preferred_language_updated_at:selectedAt}})
    if(updateError)console.warn('[UGO i18n] Language saved locally; account sync failed.')
    if(!updateError&&role==='client'&&seq===revision.current){
     const{error:profileError}=await client.from('perfiles_cliente').update({idioma_preferido:next}).eq('usuario_id',data.session.user.id)
     if(profileError)console.warn('[UGO i18n] Profile language sync failed.')
    }
   }catch{console.warn('[UGO i18n] Language saved locally; account sync failed.')}
   finally{if(seq===revision.current)pending.current=null}
  })
 },[role])
 const value=useMemo<LocaleContextValue>(()=>({locale,setLocale,t:(key,params)=>translate(locale,key,params)}),[locale,setLocale])
 return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(){const value=useContext(LocaleContext);if(!value)throw new Error('useLocale must be used within LocaleProvider');return value}

export function LocalizedText({id,params}:{id:string;params?:Record<string,string|number>}){const{t}=useLocale();return <>{t(id,params)}</>}
