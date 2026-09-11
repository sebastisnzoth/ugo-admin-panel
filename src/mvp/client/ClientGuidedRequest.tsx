import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getDispatchProvider}from'../../lib/dispatch/provider'
import{ClientRequestEvidence}from'../ClientRequestEvidence'
import{UGO_CLIENT_GUIDED_REQUEST_OPEN}from'../ClientQuickOrder'
import{parseClientIntent}from'../hugoIntent'
import{UGO_UI_EVENTS}from'../uiEvents'
import{useRoleSession,type Category}from'../shared'
import{useClientFlow}from'./clientFlow'

type Step='idle'|'need'|'photo'|'when'|'review'|'matching'
type When='ahora'|'hoy'|'programar'
type Draft={description:string;categoryId:string;categoryName:string;categorySlug:string;address:string;when:When;scheduleAt:string;urgent:boolean;amount:number|null}
type RateRow={tarifa_base:number|null}

const emptyDraft:Draft={description:'',categoryId:'',categoryName:'',categorySlug:'',address:'',when:'hoy',scheduleAt:'',urgent:false,amount:null}
const ACTIVE_SERVICE_STATES=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado']
const MATCHING_STATES=['buscando','ofrecido']

function normalize(v:string){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function categoryByHint(categories:Category[],hint:string){const q=normalize(hint);return categories.find(c=>[c.nombre,c.slug].some(v=>{const n=normalize(String(v||''));return n.includes(q)||q.includes(n)}))||null}

export function ClientGuidedRequest(){
 const flow=useClientFlow()
 const auth=useRoleSession('client'),{supabase,session}=auth
 const[categories,setCategories]=useState<Category[]>([])
 const[step,setStep]=useState<Step>('idle')
 const[draft,setDraft]=useState<Draft>(emptyDraft)
 const[draftId,setDraftId]=useState('')
 const[photoCount,setPhotoCount]=useState(0)
 const[photoBusy,setPhotoBusy]=useState(false)
 const[busy,setBusy]=useState(false)
 const[message,setMessage]=useState('')
 const[hasActive,setHasActive]=useState(false)
 const[activeServiceId,setActiveServiceId]=useState('')
 const[ready,setReady]=useState(false)
 const progress=step==='need'?1:step==='photo'?2:step==='when'?3:step==='review'?4:step==='matching'?5:0
 const selectedCategory=useMemo(()=>categories.find(c=>c.id===draft.categoryId)||null,[categories,draft.categoryId])
 const storageKey=session?`ugo:guided-request-draft:${session.user.id}`:''

 const estimate=useCallback(async(categoryId:string)=>{
  const{data}=await supabase.from('proveedores_mapa').select('tarifa_base').eq('categoria_principal_id',categoryId).eq('online',true).eq('disponible',true).limit(8)
  const values=((data||[])as RateRow[]).map(p=>Number(p.tarifa_base)).filter(n=>Number.isFinite(n)&&n>0).sort((a,b)=>a-b)
  return values.length?values[Math.floor(values.length/2)]:null
 },[supabase])

 const load=useCallback(async()=>{
  if(!session){setReady(false);return}
  const[{data:cats},{data:profile},{data:active}]=await Promise.all([
   supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre'),
   supabase.from('perfiles_cliente').select('direccion,barrio,ciudad,onboarding_completo_at,termos_aceitos_at').eq('usuario_id',session.user.id).maybeSingle(),
   supabase.from('servicios').select('id,estado').eq('cliente_id',session.user.id).in('estado',ACTIVE_SERVICE_STATES).order('created_at',{ascending:false}).limit(1),
  ])
  const p=profile as{direccion?:string|null;barrio?:string|null;ciudad?:string|null;onboarding_completo_at?:string|null;termos_aceitos_at?:string|null}|null
  setReady(Boolean(p?.onboarding_completo_at&&p?.termos_aceitos_at))
  setCategories((cats||[])as Category[])
  const activeRow=(active||[])[0]as{id:string;estado:string}|undefined
  setHasActive(Boolean(activeRow));setActiveServiceId(activeRow?.id||'')
  const address=[p?.direccion,p?.barrio,p?.ciudad].filter(Boolean).join(', ')
  let restored:Partial<Draft>={}
  try{restored=JSON.parse(sessionStorage.getItem(`ugo:guided-request-draft:${session.user.id}`)||'{}') as Partial<Draft>}catch{restored={}}
  setDraft(v=>({...v,address:v.address||address,...restored}))
  let id:string
  try{id=sessionStorage.getItem(`ugo:guided-request:${session.user.id}`)||''}catch{id=''}
  if(!id)id=crypto.randomUUID()
  setDraftId(id)
  try{sessionStorage.setItem(`ugo:guided-request:${session.user.id}`,id)}catch{console.warn('No se pudo persistir el identificador del pedido guiado.')}
 },[session,supabase])

 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load])
 useEffect(()=>{if(!storageKey)return;try{sessionStorage.setItem(storageKey,JSON.stringify(draft))}catch{console.warn('No se pudo persistir el borrador guiado.')}},[draft,storageKey])

 const applyCategory=useCallback(async(category:Category,text:string,urgent:boolean)=>{const amount=await estimate(category.id);setDraft(v=>({...v,description:text,categoryId:category.id,categoryName:category.nombre,categorySlug:category.slug,urgent,amount}));return category},[estimate])
 const infer=useCallback(async(text:string,hint?:string|null,urgent=false)=>{let category=hint?categoryByHint(categories,hint):null;if(!category){const intent=parseClientIntent(text,categories);category=categories.find(c=>c.id===intent.categoryId)||null;urgent=urgent||intent.urgency}if(category)return applyCategory(category,text,urgent);setDraft(v=>({...v,description:text,urgent}));return null},[applyCategory,categories])

 useEffect(()=>{if(!ready)return;const onText=(event:Event)=>{const text=String((event as CustomEvent<{text?:string}>).detail?.text||'').trim();if(!text)return;void infer(text);setStep('need')};const onIntent=(event:Event)=>{const d=(event as CustomEvent<{text?:string;description?:string|null;categoryHint?:string|null;urgent?:boolean}>).detail||{};const text=String(d.description||d.text||'').trim();if(!text)return;void infer(text,d.categoryHint,Boolean(d.urgent));setStep('need')};const onOpen=()=>{if(hasActive){setMessage('Ya tenés un servicio en curso. Podés seguirlo desde Inicio.');return}setMessage('');setStep('need')};window.addEventListener('ugo:hugo-user-text',onText as EventListener);window.addEventListener('ugo:hugo-ai-intent',onIntent as EventListener);window.addEventListener(UGO_CLIENT_GUIDED_REQUEST_OPEN,onOpen);return()=>{window.removeEventListener('ugo:hugo-user-text',onText as EventListener);window.removeEventListener('ugo:hugo-ai-intent',onIntent as EventListener);window.removeEventListener(UGO_CLIENT_GUIDED_REQUEST_OPEN,onOpen)}},[hasActive,infer,ready])

 useEffect(()=>{if(!session||!activeServiceId)return;const channel=supabase.channel(`client-guided-service-${activeServiceId}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'servicios',filter:`id=eq.${activeServiceId}`},payload=>{const state=String((payload.new as{estado?:string})?.estado||'');if(!state)return;if(!MATCHING_STATES.includes(state)){setHasActive(true);setStep('idle');setMessage('');flow.navigate('home')}}).subscribe();return()=>{supabase.removeChannel(channel)}},[activeServiceId,flow,session,supabase])

 function start(){if(hasActive){setMessage('Ya tenés un servicio en curso. Podés seguirlo desde Inicio.');return}setMessage('');setStep('need')}
 function askHugo(){window.dispatchEvent(new Event(UGO_UI_EVENTS.clientHugo))}
 async function confirmNeed(){const text=draft.description.trim();if(text.length<5){setMessage('Contame en una frase qué necesitás.');return}let category=selectedCategory;if(!category)category=await infer(text);if(!category){setMessage('Hugo necesita confirmar qué tipo de profesional corresponde. Elegí una categoría o contale un poco más.');return}if(draft.categoryId!==category.id)await applyCategory(category,text,draft.urgent);setMessage('');setStep('photo')}
 async function chooseCategory(category:Category){await applyCategory(category,draft.description,draft.urgent);setMessage('')}
 function chooseWhen(value:When){setDraft(v=>({...v,when:value,urgent:value==='ahora',scheduleAt:value==='programar'?v.scheduleAt:''}));setMessage('')}
 function continueFromWhen(){if(!draft.address.trim()){setMessage('Confirmá dónde se hará el trabajo.');return}if(draft.when==='programar'&&!draft.scheduleAt){setMessage('Elegí día y hora para programar el servicio.');return}setMessage('');setStep('review')}

 async function submit(){
  if(!session||!draft.categoryId||draft.description.trim().length<5)return
  if(photoCount<1){setMessage('Agregá al menos una foto del trabajo antes de enviar la solicitud.');setStep('photo');return}
  setBusy(true);setMessage('')
  try{
   const{data,error}=await supabase.from('servicios').insert({cliente_id:session.user.id,categoria_id:draft.categoryId,estado:'buscando',descripcion:draft.description.trim(),direccion_cliente:draft.address.trim()||null,tarifa:draft.amount,urgencia:draft.urgent,metadata:{source:'hugo-guided-request',request_draft_id:draftId,requested_when:draft.when,scheduled_at:draft.scheduleAt||null,estimated_tariff:draft.amount,demo:false}}).select('id').single()
   if(error)throw error
   if(!data?.id)throw new Error('No se pudo crear la solicitud.')
   const serviceId=String(data.id);setActiveServiceId(serviceId);setHasActive(true);setStep('matching')
   const result=await getDispatchProvider().start({serviceId,category:draft.categorySlug||draft.categoryId})
   const count=Array.isArray(result.raw)?result.raw.length:result.providerId?1:0
   setMessage(count?`Listo. UGO avisó a ${count} profesional${count===1?'':'es'} y espera una aceptación.`:'Solicitud creada. UGO sigue buscando un profesional disponible.')
   try{sessionStorage.removeItem(storageKey)}catch{console.warn('No se pudo limpiar el borrador guiado.')}
   setDraft(emptyDraft)
  }catch(e){setMessage(e instanceof Error?e.message:'No se pudo enviar la solicitud.')}finally{setBusy(false)}
 }

 if(auth.loading||!session||!ready)return null
 if(hasActive&&step==='idle')return null
 if(step==='idle')return <button type="button" className="ugo-guided-launch" onClick={start}>Pedir un servicio</button>
 return <section className="ugo-guided-request" aria-label="Solicitud guiada por Hugo"><header><button type="button" className="ugo-guided-back" onClick={()=>step==='need'?setStep('idle'):step==='photo'?setStep('need'):step==='when'?setStep('photo'):step==='review'?setStep('when'):setStep('idle')} aria-label="Volver">←</button><div><small>{Math.min(progress,4)} de 4</small><div className="ugo-guided-progress"><i style={{width:`${Math.min(progress,4)*25}%`}}/></div></div><button type="button" className="ugo-guided-orb" onClick={askHugo} aria-label="Hablar con Hugo">⌁</button></header>
  {step==='need'&&<div className="ugo-guided-step"><p className="ugo-guided-kicker">Hugo te ayuda</p><h2>¿Qué necesitás?</h2><p>Contámelo como se lo contarías a un amigo. Yo armo el pedido.</p><textarea autoFocus value={draft.description} onChange={e=>setDraft(v=>({...v,description:e.target.value}))} placeholder="Ej: Necesito colocar azulejos en el baño"/><button type="button" className="ugo-guided-voice" onClick={askHugo}>🎙 Hablar con Hugo</button>{selectedCategory&&<div className="ugo-guided-understood"><span>Entendí</span><b>{selectedCategory.emoji} {selectedCategory.nombre}</b><small>{draft.description}</small></div>}{!selectedCategory&&draft.description.length>4&&<div className="ugo-guided-categories">{categories.slice(0,6).map(c=><button type="button" key={c.id} onClick={()=>void chooseCategory(c)}>{c.emoji} {c.nombre}</button>)}</div>}<button type="button" className="ugo-guided-primary" onClick={()=>void confirmNeed()}>Sí, es eso</button></div>}
  {step==='photo'&&<div className="ugo-guided-step"><p className="ugo-guided-kicker">Evidencia del pedido</p><h2>Mostrame el problema</h2><p>Agregá al menos una foto. Ayuda a Hugo y al profesional a entender el trabajo antes de aceptar.</p><ClientRequestEvidence draftId={draftId} inline onBusyChange={setPhotoBusy} onCountChange={setPhotoCount}/><button type="button" className="ugo-guided-primary" disabled={photoBusy||photoCount<1} onClick={()=>setStep('when')}>{photoBusy?'Subiendo foto…':photoCount?'Usar esta foto':'Agregá una foto para continuar'}</button></div>}
  {step==='when'&&<div className="ugo-guided-step"><p className="ugo-guided-kicker">Casi listo</p><h2>¿Cuándo lo necesitás?</h2><div className="ugo-guided-options"><button type="button" className={draft.when==='ahora'?'selected':''} onClick={()=>chooseWhen('ahora')}><b>⚡ Ahora</b><span>Lo antes posible</span></button><button type="button" className={draft.when==='hoy'?'selected':''} onClick={()=>chooseWhen('hoy')}><b>Hoy</b><span>Durante el día</span></button><button type="button" className={draft.when==='programar'?'selected':''} onClick={()=>chooseWhen('programar')}><b>Elegir día y hora</b><span>Programá el momento que te sirve</span></button></div>{draft.when==='programar'&&<label>Día y hora<input type="datetime-local" value={draft.scheduleAt} onChange={e=>setDraft(v=>({...v,scheduleAt:e.target.value}))}/></label>}<label>¿Dónde?<input value={draft.address} onChange={e=>setDraft(v=>({...v,address:e.target.value}))} placeholder="Tu dirección"/></label><button type="button" className="ugo-guided-primary" onClick={continueFromWhen}>Revisar pedido</button></div>}
  {step==='review'&&<div className="ugo-guided-step"><p className="ugo-guided-kicker">Hugo entendió esto</p><h2>Revisá y confirmá</h2><div className="ugo-guided-summary"><div><span>Servicio</span><b>{selectedCategory?.emoji} {draft.categoryName}</b></div><div><span>Necesidad</span><b>{draft.description}</b></div><div><span>Cuándo</span><b>{draft.when==='ahora'?'Ahora':draft.when==='hoy'?'Hoy':draft.scheduleAt?new Date(draft.scheduleAt).toLocaleString():'A programar'}</b></div><div><span>Dónde</span><b>{draft.address}</b></div><div><span>Fotos</span><b>{photoCount} adjunta{photoCount===1?'':'s'}</b></div><div><span>Precio</span><b>{draft.amount!=null?`Referencia actual: R$ ${draft.amount.toFixed(0)}`:'A confirmar según el trabajo y el profesional'}</b></div></div><button type="button" className="ugo-guided-primary" onClick={submit} disabled={busy||photoCount<1}>{busy?'Buscando…':'Encontrar profesionales'}</button></div>}
  {step==='matching'&&<div className="ugo-guided-step ugo-guided-matching"><div className="ugo-guided-pulse">⌁</div><h2>Buscando profesionales…</h2><p>{message||'Hugo está buscando la mejor opción disponible para tu solicitud.'}</p><button type="button" className="ugo-guided-voice" onClick={()=>{setStep('idle');flow.navigate('home')}}>Seguir desde Inicio</button></div>}
  {message&&step!=='matching'&&<div className="ugo-guided-message">{message}</div>}
 </section>
}
