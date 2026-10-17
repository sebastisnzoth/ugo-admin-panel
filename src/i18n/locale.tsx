import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState}from'react'
import{getRoleSupabase,type UgoRole}from'../lib/roleSupabase'
import{supabase as adminSupabase}from'../lib/supabase'

export type UgoLocale='pt-BR'|'es'|'en'
type LocaleContextValue={locale:UgoLocale;setLocale:(locale:UgoLocale)=>void;t:(key:string)=>string}
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
const LocaleContext=createContext<LocaleContextValue|null>(null)
function isLocale(value:unknown):value is UgoLocale{return typeof value==='string'&&SUPPORTED.includes(value as UgoLocale)}
function roleFromLocation():UgoRole|'admin'|null{
 const app=new URLSearchParams(window.location.search).get('app')
 if(app==='client'||app==='client-web'||app==='stitch-client')return'client'
 if(app==='provider'||app==='provider-web'||app==='recruit')return'provider'
 if(app==='admin')return'admin'
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
 useEffect(()=>{
  const client=authClient()
  if(!client)return
  let alive=true
  const apply=(session:{user:{id:string;user_metadata?:Record<string,unknown>}}|null)=>{
   if(!alive)return
   if(!session){accountKey.current=null;pending.current=null;setLocaleState(initialLocale());return}
   const key=accountLocaleKey(role||'unknown',session.user.id)
   if(accountKey.current!==key){accountKey.current=key;pending.current=null}
   // Local changes made during async metadata updates take priority over token refresh events.
   if(pending.current)return
   let local:unknown
   try{local=window.localStorage.getItem(key)}catch{}
   const metadata=session.user.user_metadata?.preferred_language
   const chosen=isLocale(metadata)?metadata:isLocale(local)?local:'pt-BR'
   setLocaleState(chosen)
   try{window.localStorage.setItem(key,chosen)}catch{}
  }
  void client.auth.getSession().then(({data,error})=>{if(!error)apply(data.session)}).catch(()=>{})
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
  try{window.localStorage.setItem(key||guestLocaleKey(),next)}catch{}
  const client=authClient()
  if(!client){pending.current=null;return}
  void (async()=>{
   try{
    const{data,error}=await client.auth.getSession()
    if(error||!data.session)return
    const actualKey=accountLocaleKey(role||'unknown',data.session.user.id)
    accountKey.current=actualKey
    try{window.localStorage.setItem(actualKey,next)}catch{}
    const{error:updateError}=await client.auth.updateUser({data:{preferred_language:next}})
    if(updateError)console.warn('[UGO i18n] Language saved locally; account sync failed.')
   }catch{console.warn('[UGO i18n] Language saved locally; account sync failed.')}
   finally{if(seq===revision.current)pending.current=null}
  })()
 },[role])
 const value=useMemo<LocaleContextValue>(()=>({locale,setLocale,t:(key)=>messages[locale][key]??messages['pt-BR'][key]??key}),[locale,setLocale])
 return <LocaleContext.Provider value={value}>{children}<LanguageSelector/></LocaleContext.Provider>
}

export function useLocale(){const value=useContext(LocaleContext);if(!value)throw new Error('useLocale must be used within LocaleProvider');return value}

function LanguageSelector(){
 const{locale,setLocale,t}=useLocale()
 const[open,setOpen]=useState(false)
 const[notice,setNotice]=useState('')
 const options:[UgoLocale,string][]=[['pt-BR','🇧🇷 Português (Brasil)'],['es','🇦🇷 Español'],['en','🇺🇸 English']]
 function choose(next:UgoLocale){setLocale(next);setNotice(messages[next]['language.saved']);setOpen(false);window.setTimeout(()=>setNotice(''),2400)}
 return <div className="ugo-language-control" lang={locale}>
  <button type="button" className="ugo-language-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={t('language.label')} onClick={()=>setOpen(v=>!v)}><span aria-hidden="true">🌐</span><span>{locale==='pt-BR'?'PT-BR':locale.toUpperCase()}</span><span aria-hidden="true">⌄</span></button>
  {open&&<div className="ugo-language-menu" role="listbox" aria-label={t('language.label')}>{options.map(([value,label])=><button type="button" role="option" aria-selected={locale===value} key={value} onClick={()=>choose(value)}>{label}{locale===value&&<span aria-hidden="true"> ✓</span>}</button>)}</div>}
  {notice&&<span className="ugo-language-status" role="status">{notice}</span>}
 </div>
}
