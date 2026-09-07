import { useCallback, useEffect, useRef, useState } from 'react'

export type HugoVoiceState = 'idle' | 'connecting' | 'ready' | 'hearing' | 'speaking' | 'error'
type VoiceOptions = { role: 'client' | 'provider'; accessToken?: string; context: string }
type ChatTurn = { role: 'user' | 'assistant'; content: string }
type GeminiReply = { reply: string; action?: 'none'|'search_provider'|'prepare_request'; category_hint?: string|null; urgent?: boolean; description?: string|null; model?: string }
type NativeVoiceBridge={startListening:()=>void;stopListening:()=>void;isAvailable?:()=>boolean}
type VisibleCardReply={reply:string;categoryHint:string|null;selectedText?:string|null}
type ClientVoiceAction='hire_provider'|'create_request'|'pay'|'cancel'|'approve'|'dispute'
type PendingAction={action:ClientVoiceAction}
type HugoLocale='es-AR'|'pt-BR'

const CLIENT_BEHAVIOR=[
 'Sos Hugo, asistente operativo de UGO Cliente, no un chatbot genérico.',
 'Hablá natural, cálido y directo. Respondé en el idioma preferido o en el idioma que use el cliente.',
 'Respondé normalmente en 1 o 2 frases cortas, fáciles de escuchar.',
 'Preguntá solamente el dato imprescindible que falta; no repitas datos ya conocidos.',
 'Usá el historial para entender sí, dale, ese, el primero, o equivalentes en portugués, y las correcciones del usuario.',
 'Si cambia de intención o de tema, seguí el tema nuevo sin perder el estado operativo y sin ejecutar una confirmación anterior.',
 'Nunca inventes proveedor, precio, reputación, ETA, pago, evidencia ni estado.',
 'La app y sus datos reales son la fuente de verdad.',
 'Buscar, filtrar, leer perfiles y mostrar estado no requieren confirmación.',
 'Contratar, crear definitivamente un pedido, pagar, cancelar, liberar pago o abrir disputa requieren confirmación explícita antes de ejecutar.',
 'No uses lenguaje técnico de backend, APIs, RPC, RLS, webhooks, sandbox o infraestructura.',
 'No termines con una pregunta si el siguiente paso ya está claro.',
].join(' ')

const COPY={
 'es-AR':{
  heard:'Te escucho.',resume:'Seguimos donde quedamos. Te escucho.',noChange:'Perfecto, no hago ningún cambio.',
  unavailable:'Esa acción no está disponible en este momento.',fallback:'No pude responder ahora, pero tu pedido sigue intacto.',
  mic:'Permití el micrófono para hablar con Hugo.',noVoice:'El reconocimiento de voz no está disponible en este dispositivo.',
  voiceInterrupted:'Se interrumpió el reconocimiento de voz.',lang:'Listo. Seguimos en español.',
  needConfirm:'Necesito una confirmación clara.',
 },
 'pt-BR':{
  heard:'Estou ouvindo.',resume:'Continuamos de onde paramos. Estou ouvindo.',noChange:'Perfeito, não vou fazer nenhuma alteração.',
  unavailable:'Essa ação não está disponível neste momento.',fallback:'Não consegui responder agora, mas seu pedido continua intacto.',
  mic:'Permita o microfone para falar com o Hugo.',noVoice:'O reconhecimento de voz não está disponível neste dispositivo.',
  voiceInterrupted:'O reconhecimento de voz foi interrompido.',lang:'Pronto. Continuamos em português.',
  needConfirm:'Preciso de uma confirmação clara.',
 },
} as const

function sessionKey(role:string,token?:string){let uid='anon';try{const payload=JSON.parse(atob(String(token||'').split('.')[1]?.replace(/-/g,'+').replace(/_/g,'/')||''));uid=String(payload?.sub||'anon')}catch{}return `ugo:hugo:history:${role}:${uid}`}
function readHistory(key:string):ChatTurn[]{try{const raw=sessionStorage.getItem(key);const value=raw?JSON.parse(raw):[];return Array.isArray(value)?value.slice(-20):[]}catch{return[]}}
function writeHistory(key:string,history:ChatTurn[]){try{sessionStorage.setItem(key,JSON.stringify(history.slice(-20)))}catch{}}
function getNativeBridge(){return (window as any).UGOVoiceBridge as NativeVoiceBridge|undefined}
async function ensureMicrophoneAccess(){if(!navigator.mediaDevices?.getUserMedia)return;const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});stream.getTracks().forEach(track=>track.stop())}
function normalizeText(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim()}
function contextLocale(context:string):HugoLocale{const m=normalizeText(context);return /idioma preferido\s*:\s*(pt|pt br|portugues)/.test(m)?'pt-BR':'es-AR'}
function explicitLocale(text:string):HugoLocale|null{const m=normalizeText(text);if(/\b(fala|fale|responde|responda)\b.*\bportugues\b|\bem portugues\b/.test(m))return'pt-BR';if(/\b(habla|hablame|responde)\b.*\bespanol\b|\ben espanol\b/.test(m))return'es-AR';return null}
function inferredLocale(text:string,current:HugoLocale):HugoLocale{const m=normalizeText(text),pt=(m.match(/\b(quero|preciso|pode|voce|vocês|obrigado|obrigada|servico|trabalho|encanador|jardineiro|chaveiro|agora|nao|sim)\b/g)||[]).length,es=(m.match(/\b(quiero|necesito|podes|puedes|vos|gracias|servicio|trabajo|plomero|jardinero|cerrajero|ahora|no|si)\b/g)||[]).length;if(pt>=2&&pt>es)return'pt-BR';if(es>=2&&es>pt)return'es-AR';return current}
function requestedCategory(text:string){const m=normalizeText(text);if(/\b(jardinero|jardinera|jardineria|jardin|jardineiro|jardinagem)\b/.test(m))return'jardineria';if(/\b(electricista|electricidad|electrico|electrica|eletricista|eletrica|eletrico)\b/.test(m))return'electricidad';if(/\b(plomero|plomera|plomeria|fontanero|fontaneria|encanador|encanamento)\b/.test(m))return'plomeria';if(/\b(limpieza|limpiador|limpiadora|faxina|limpeza|diarista)\b/.test(m))return'limpieza';if(/\b(pintor|pintora|pintura)\b/.test(m))return'pintura';if(/\b(cerrajero|cerrajeria|chaveiro)\b/.test(m))return'cerrajeria';return null}
function ordinalIndex(text:string){const m=normalizeText(text);if(/\b(primero|primera|primeiro|primeira|1|uno|um)\b/.test(m))return 0;if(/\b(segundo|segunda|2|dos|dois|duas)\b/.test(m))return 1;if(/\b(tercero|tercera|terceiro|terceira|3|tres)\b/.test(m))return 2;return null}
function isShortReference(text:string){const m=normalizeText(text);return /^(ese|esa|ese mismo|esa misma|esse|essa|esse mesmo|essa mesma|el primero|la primera|o primeiro|a primeira|el segundo|la segunda|o segundo|a segunda|el tercero|la tercera|o terceiro|a terceira|primero|primeiro|segundo|tercero|terceiro)$/.test(m)}
function compactSpeech(text:string,max=320){const cleaned=String(text||'').replace(/[*_#`]/g,'').replace(/\s+/g,' ').trim();if(cleaned.length<=max)return cleaned;const cut=cleaned.slice(0,max);const end=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('? '),cut.lastIndexOf('! '));return (end>120?cut.slice(0,end+1):cut).trim()}
function providerCardNodes(){return Array.from(document.querySelectorAll<HTMLElement>('.ugo-feature-card,.ugo-provider-card'))}
function providerCards(){const nodes=providerCardNodes(),seen=new Set<string>();return nodes.map(node=>String(node.innerText||node.textContent||'').replace(/\s+/g,' ').trim()).filter(Boolean).filter(text=>{const key=normalizeText(text);if(seen.has(key))return false;seen.add(key);return true})}
function selectProviderReference(userText:string){const nodes=providerCardNodes(),ordinal=ordinalIndex(userText),m=normalizeText(userText);if(ordinal!=null&&nodes[ordinal]){nodes[ordinal].click();return true}const named=nodes.find(node=>{const text=normalizeText(String(node.innerText||node.textContent||''));const first=text.split(' ')[0];return first.length>2&&m.includes(first)});if(named){named.click();return true}return false}
function visibleProviderCardReply(userText:string,locale:HugoLocale):VisibleCardReply|null{
 const m=normalizeText(userText),category=requestedCategory(userText),ordinal=ordinalIndex(userText),lookup=/\b(busca|buscame|buscar|hay|encontra|encontrame|encontre|procura|procurar|cerca|perto|disponible|disponivel|quien|quienes|quem|perfil|contame|conte|hablame|mostrame|mostre|lee|leeme)\b/.test(m)||isShortReference(userText)
 if(!category&&!lookup&&ordinal==null)return null
 const cards=providerCards();if(!cards.length)return null
 if(ordinal!=null&&cards[ordinal]){const selected=cards[ordinal];const which=locale==='pt-BR'?(ordinal===0?'primeiro':ordinal===1?'segundo':'terceiro'):(ordinal===0?'primero':ordinal===1?'segundo':'tercero');return{reply:locale==='pt-BR'?`Este é o ${which}: ${selected}.`:`Este es el ${which}: ${selected}.`,categoryHint:category,selectedText:selected}}
 let matches=cards.filter(text=>!category||normalizeText(text).includes(category))
 const named=cards.filter(text=>{const first=normalizeText(text).split(' ')[0];return first.length>2&&m.includes(first)})
 if(named.length)matches=named
 if(!matches.length)return null
 matches=matches.slice(0,3)
 if(matches.length===1)return{reply:locale==='pt-BR'?`Encontrei este profissional: ${matches[0]}.`:`Encontré este profesional: ${matches[0]}.`,categoryHint:category,selectedText:matches[0]}
 return{reply:locale==='pt-BR'?`Encontrei ${matches.length} opções. Vou te mostrar as melhores.`:`Encontré ${matches.length} opciones. Te muestro las mejores.`,categoryHint:category}
}
function isVisible(el:HTMLElement){const style=window.getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&!el.hasAttribute('disabled')}
function clickByText(patterns:RegExp[],allowHidden=false){const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('button'));const target=buttons.find(button=>{const text=normalizeText(button.innerText||button.textContent||'');return (allowHidden||isVisible(button))&&patterns.some(p=>p.test(text))});if(!target)return false;target.click();return true}
function executeClientAction(action:ClientVoiceAction){
 if(action==='hire_provider'){const btn=document.querySelector<HTMLButtonElement>('.ugo-hire-button');if(btn&&isVisible(btn)){btn.click();return true}return false}
 if(action==='create_request')return clickByText([/enviar pedido/,/crear pedido/,/criar pedido/,/pedir servico/,/confirmar pedido/,/solicitar servico/])
 if(action==='pay')return clickByText([/pagar con pix/,/pagar com pix/,/pagar servicio/,/pagar servico/,/^pagar r\$/,/^pagar$/])
 if(action==='cancel')return clickByText([/cancelar pedido/,/cancelar servicio/,/cancelar servico/])
 if(action==='approve')return clickByText([/estoy conforme/,/estou de acordo/,/aprobar y liberar pago/,/aprovar e liberar pagamento/,/liberar pago/,/liberar pagamento/])
 if(action==='dispute'){const btn=document.querySelector<HTMLButtonElement>('.ugo-dispute-launch');if(btn){btn.click();return true}return clickByText([/abrir disputa/,/tengo un problema/,/tenho um problema/],true)}
 return false
}
function affirmative(text:string){const m=normalizeText(text);return /^(si|sim|dale|confirmo|confirmar|hacelo|hacele|faca|pode fazer|adelante|okey|okay|ok|de acuerdo|de acordo|correcto|correto)(\s+(hacelo|faca|confirmo|adelante|pode fazer))?$/.test(m)}
function negative(text:string){return /^(no|nao|no gracias|nao obrigado|nao obrigada|cancelalo|cancela eso|cancele isso|dejalo|deja|deixe|melhor nao|mejor no)$/.test(normalizeText(text))}
function requestedAction(text:string):ClientVoiceAction|null{const m=normalizeText(text)
 if(/\b(contratalo|contratala|contratarlo|contratarla|contrata este|contrata esta|contrate ele|contrate ela|contratar esse|contratar essa|elegi este|elegi esta|escolha esse|escolha essa)\b/.test(m))return'hire_provider'
 if(/\b(enviar pedido|manda el pedido|mandalo|crear pedido|criar pedido|confirmar pedido|pedir el servicio|pedir o servico|envia o pedido|enviar o pedido)\b/.test(m))return'create_request'
 if(/\b(pagar|paga|pagalo|pague|pagar con pix|pagar com pix|hacer el pago|fazer o pagamento)\b/.test(m))return'pay'
 if(/\b(cancelar pedido|cancelar servicio|cancelar servico|cancela el pedido|cancela el servicio|cancele o pedido|cancele o servico)\b/.test(m))return'cancel'
 if(/\b(estoy conforme|estou de acordo|estou conforme|libera el pago|liberar el pago|liberar pagamento|libere o pagamento|aproba el trabajo|aprobar el trabajo|aprovar o trabalho|todo quedo bien|ficou tudo certo)\b/.test(m))return'approve'
 if(/\b(abrir disputa|quiero una disputa|quero abrir uma disputa|tengo un problema|tenho um problema|no quedo bien|nao ficou bom|no estoy conforme|nao estou de acordo)\b/.test(m))return'dispute'
 return null
}
function actionCopy(action:ClientVoiceAction,locale:HugoLocale){const pt=locale==='pt-BR';const map:Record<ClientVoiceAction,{prompt:string;success:string}>={
 hire_provider:{prompt:pt?'Confirma que quer contratar este profissional?':'¿Confirmás que querés contratar a este profesional?',success:pt?'Pronto. Abri o pedido com este profissional selecionado.':'Listo. Abrí el pedido con este profesional seleccionado.'},
 create_request:{prompt:pt?'Confirma que quer enviar este pedido?':'¿Confirmás que querés enviar este pedido?',success:pt?'Pronto. Enviei o pedido.':'Listo. Envié el pedido.'},
 pay:{prompt:pt?'Confirma que quer iniciar o pagamento deste serviço?':'¿Confirmás que querés iniciar el pago de este servicio?',success:pt?'Pronto. Abri o pagamento.':'Listo. Abrí el pago.'},
 cancel:{prompt:pt?'Confirma que quer cancelar este serviço?':'¿Confirmás que querés cancelar este servicio?',success:pt?'Pronto. Cancelei o serviço.':'Listo. Cancelé el servicio.'},
 approve:{prompt:pt?'Confirma que está de acordo e quer liberar o pagamento?':'¿Confirmás que estás conforme y querés liberar el pago?',success:pt?'Pronto. Aprovei o trabalho e liberei o pagamento.':'Listo. Aprobé el trabajo y liberé el pago.'},
 dispute:{prompt:pt?'Confirma que quer abrir uma disputa por este serviço?':'¿Confirmás que querés abrir una disputa por este servicio?',success:pt?'Pronto. Abri a disputa para você informar o problema.':'Listo. Abrí la disputa para que puedas informar el problema.'},
 };return map[action]}
function looksLikeNewIntent(text:string){const m=normalizeText(text);return Boolean(requestedAction(text)||requestedCategory(text)||ordinalIndex(text)!=null||/\b(busca|buscar|encontra|encontrame|procura|procurar|quien|quem|que|como|cuanto|quanto|donde|onde|perfil|mostrame|mostre|otro|otra|outro|outra)\b/.test(m))}
async function fetchWithRecovery(url:string,init:RequestInit,retries=1){let last:unknown;for(let attempt=0;attempt<=retries;attempt++){const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),12000);try{const response=await fetch(url,{...init,signal:controller.signal});window.clearTimeout(timer);if(response.ok||![429,502,503,504].includes(response.status)||attempt===retries)return response;await new Promise(r=>window.setTimeout(r,350*(attempt+1)))}catch(e){window.clearTimeout(timer);last=e;if(attempt===retries)throw e;await new Promise(r=>window.setTimeout(r,350*(attempt+1)))}}throw last instanceof Error?last:new Error('NETWORK_ERROR')}

export function useHugoVoice({ role, accessToken, context }: VoiceOptions) {
 const[state,setState]=useState<HugoVoiceState>('idle'),[error,setError]=useState(''),[userTranscript,setUserTranscript]=useState(''),[assistantTranscript,setAssistantTranscript]=useState('')
 const recognitionRef=useRef<any>(null),nativeModeRef=useRef(false),runningRef=useRef(false),busyRef=useRef(false),historyRef=useRef<ChatTurn[]>([]),roleRef=useRef(role),contextRef=useRef(context),tokenRef=useRef(accessToken),historyKeyRef=useRef(sessionKey(role,accessToken)),lastCategoryRef=useRef<string|null>(null),pendingActionRef=useRef<PendingAction|null>(null),localeRef=useRef<HugoLocale>(contextLocale(context))
 useEffect(()=>{roleRef.current=role},[role])
 useEffect(()=>{contextRef.current=context;const next=contextLocale(context);localeRef.current=next;if(recognitionRef.current)recognitionRef.current.lang=next},[context])
 useEffect(()=>{tokenRef.current=accessToken},[accessToken])
 useEffect(()=>{historyKeyRef.current=sessionKey(role,accessToken);historyRef.current=readHistory(historyKeyRef.current)},[role,accessToken])

 const startRecognition=useCallback(()=>{if(!runningRef.current||busyRef.current)return;if(nativeModeRef.current){try{getNativeBridge()?.startListening();setState('ready')}catch{}return}if(!recognitionRef.current)return;try{recognitionRef.current.lang=localeRef.current;recognitionRef.current.start();setState('ready')}catch{}},[])
 const speak=useCallback((text:string)=>new Promise<void>(resolve=>{const spoken=compactSpeech(text),locale=localeRef.current;if(!window.speechSynthesis){busyRef.current=false;if(runningRef.current)window.setTimeout(startRecognition,80);resolve();return}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(spoken);u.lang=locale;u.rate=locale==='pt-BR'?1.06:1.1;u.pitch=1;u.onstart=()=>{setState('speaking');if(nativeModeRef.current&&runningRef.current){try{getNativeBridge()?.startListening()}catch{}}};u.onend=()=>{busyRef.current=false;if(runningRef.current){setState('ready');window.setTimeout(startRecognition,70)}resolve()};u.onerror=()=>{busyRef.current=false;if(runningRef.current)window.setTimeout(startRecognition,90);resolve()};window.speechSynthesis.speak(u)}),[startRecognition])
 const remember=useCallback((userText:string,reply:string)=>{const next=[...historyRef.current,{role:'user',content:userText},{role:'assistant',content:reply}] as ChatTurn[];historyRef.current=next.slice(-20);writeHistory(historyKeyRef.current,historyRef.current)},[])

 const askHugo=useCallback(async(userText:string)=>{const token=tokenRef.current;if(!token)throw new Error('SESION_REQUERIDA');busyRef.current=true;setState('connecting');setError('')
  const explicit=explicitLocale(userText),nextLocale=explicit||inferredLocale(userText,localeRef.current);if(nextLocale!==localeRef.current){localeRef.current=nextLocale;if(recognitionRef.current)recognitionRef.current.lang=nextLocale}
  const locale=localeRef.current
  if(roleRef.current==='client')window.dispatchEvent(new CustomEvent('ugo:hugo-user-text',{detail:{text:userText}}))
  if(explicit){const reply=COPY[locale].lang;remember(userText,reply);setAssistantTranscript(reply);await speak(reply);return}
  if(roleRef.current==='client'){
   const pending=pendingActionRef.current
   if(pending){
    if(affirmative(userText)){pendingActionRef.current=null;const copy=actionCopy(pending.action,locale),ok=executeClientAction(pending.action),reply=ok?copy.success:COPY[locale].unavailable;remember(userText,reply);setAssistantTranscript(reply);await speak(reply);return}
    if(negative(userText)){pendingActionRef.current=null;const reply=COPY[locale].noChange;remember(userText,reply);setAssistantTranscript(reply);await speak(reply);return}
    if(!looksLikeNewIntent(userText)){const reply=`${COPY[locale].needConfirm} ${actionCopy(pending.action,locale).prompt}`;remember(userText,reply);setAssistantTranscript(reply);await speak(reply);return}
    pendingActionRef.current=null
   }
   const action=requestedAction(userText)
   if(action){pendingActionRef.current={action};const reply=actionCopy(action,locale).prompt;remember(userText,reply);setAssistantTranscript(reply);await speak(reply);return}
   await new Promise(resolve=>window.setTimeout(resolve,70))
   const category=requestedCategory(userText);if(category)lastCategoryRef.current=category
   if(isShortReference(userText)||ordinalIndex(userText)!=null)selectProviderReference(userText)
   const visible=visibleProviderCardReply(userText,locale)
   if(visible){const reply=compactSpeech(visible.reply);remember(userText,reply);window.dispatchEvent(new CustomEvent('ugo:hugo-ai-intent',{detail:{text:userText,action:'search_provider',categoryHint:visible.categoryHint||lastCategoryRef.current,urgent:false,description:null,selectedText:visible.selectedText||null}}));setAssistantTranscript(reply);await speak(reply);return}
  }
  const langInstruction=locale==='pt-BR'?'IDIOMA ATUAL: português do Brasil. Responda em pt-BR.':'IDIOMA ACTUAL: español. Respondé en español.'
  const mergedContext=roleRef.current==='client'?`${CLIENT_BEHAVIOR} ${langInstruction} CONTEXTO OPERATIVO REAL: ${contextRef.current}`:contextRef.current
  const response=await fetchWithRecovery('/api/test',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({message:userText,role:roleRef.current,context:mergedContext,history:historyRef.current.slice(-16)})},1)
  const data=await response.json().catch(()=>({})) as GeminiReply&{error?:string};if(!response.ok)throw new Error(data.error||`Hugo respondió ${response.status}`);const raw=String(data.reply||'').trim();if(!raw)throw new Error('RESPUESTA_VACIA');const reply=roleRef.current==='client'?compactSpeech(raw):raw;remember(userText,reply);if(roleRef.current==='client'){if(data.category_hint)lastCategoryRef.current=data.category_hint;window.dispatchEvent(new CustomEvent('ugo:hugo-ai-intent',{detail:{text:userText,action:data.action||'none',categoryHint:data.category_hint||lastCategoryRef.current,urgent:Boolean(data.urgent),description:data.description||null}}))}setAssistantTranscript(reply.slice(-500));await speak(reply)
 },[remember,speak])

 const recover=useCallback(async()=>{busyRef.current=false;const reply=COPY[localeRef.current].fallback;setAssistantTranscript(reply);if(runningRef.current){await speak(reply);window.setTimeout(startRecognition,120)}},[speak,startRecognition])

 useEffect(()=>{const onState=(event:Event)=>{if(!runningRef.current)return;const s=String((event as CustomEvent<any>).detail?.state||'');if(s==='hearing'){try{window.speechSynthesis?.cancel()}catch{};busyRef.current=false;setState('hearing')}else if(s==='ready'&&state!=='speaking')setState('ready')};const onResult=async(event:Event)=>{if(!runningRef.current)return;const d=(event as CustomEvent<any>).detail||{},text=String(d.text||'').trim();if(!text)return;if(state==='speaking'){try{window.speechSynthesis?.cancel()}catch{};busyRef.current=false}setUserTranscript(text.slice(-900));if(!d.final)return;try{await askHugo(text)}catch{await recover()}};const onError=(event:Event)=>{if(!runningRef.current)return;const code=String((event as CustomEvent<any>).detail?.code||'');if(code==='no-speech'||code==='aborted'){window.setTimeout(startRecognition,140);return}if(code==='not-allowed'||code==='unavailable'){runningRef.current=false;setError(code==='not-allowed'?COPY[localeRef.current].mic:COPY[localeRef.current].noVoice);setState('error');return}setAssistantTranscript(COPY[localeRef.current].voiceInterrupted);busyRef.current=false;window.setTimeout(startRecognition,220)};window.addEventListener('ugo:native-voice-state',onState);window.addEventListener('ugo:native-voice-result',onResult);window.addEventListener('ugo:native-voice-error',onError);return()=>{window.removeEventListener('ugo:native-voice-state',onState);window.removeEventListener('ugo:native-voice-result',onResult);window.removeEventListener('ugo:native-voice-error',onError)}},[askHugo,recover,startRecognition,state])

 const disconnect=useCallback(()=>{runningRef.current=false;busyRef.current=false;pendingActionRef.current=null;try{recognitionRef.current?.abort?.()}catch{}try{getNativeBridge()?.stopListening()}catch{}try{window.speechSynthesis?.cancel()}catch{}recognitionRef.current=null;nativeModeRef.current=false;setState('idle');setError('');setUserTranscript('');setAssistantTranscript('')},[])
 useEffect(()=>disconnect,[disconnect])

 const connect=useCallback(async()=>{if(state!=='idle'&&state!=='error')return;if(!accessToken){setError(localeRef.current==='pt-BR'?'Entre na sua conta para falar com o Hugo.':'Iniciá sesión para hablar con Hugo.');setState('error');return}setState('connecting');setError('');setUserTranscript('');setAssistantTranscript('');historyRef.current=readHistory(historyKeyRef.current);pendingActionRef.current=null;localeRef.current=contextLocale(contextRef.current)
   const welcome=historyRef.current.length?COPY[localeRef.current].resume:COPY[localeRef.current].heard
   const native=getNativeBridge();if(native){nativeModeRef.current=true;runningRef.current=true;setAssistantTranscript(welcome);try{native.startListening();return}catch{runningRef.current=false;nativeModeRef.current=false;setState('error');setError(localeRef.current==='pt-BR'?'Não consegui abrir o reconhecimento de voz nativo.':'No pude abrir el reconocimiento de voz nativo.');return}}
   nativeModeRef.current=false;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setError(COPY[localeRef.current].noVoice);setState('error');return}
   try{await ensureMicrophoneAccess()}catch(e:any){const denied=e?.name==='NotAllowedError'||e?.name==='PermissionDeniedError';setError(denied?COPY[localeRef.current].mic:(localeRef.current==='pt-BR'?'Não consegui abrir o microfone. Revise as permissões.':'No pude abrir el micrófono. Revisá los permisos.'));setState('error');return}
   runningRef.current=true;const recognition=new SR();recognition.lang=localeRef.current;recognition.continuous=false;recognition.interimResults=true;recognitionRef.current=recognition;recognition.onstart=()=>{if(runningRef.current&&!busyRef.current)setState('ready')};recognition.onspeechstart=()=>{if(runningRef.current){try{window.speechSynthesis?.cancel()}catch{};busyRef.current=false;setState('hearing')}};recognition.onresult=async(event:any)=>{let text='',isFinal=false;for(let i=event.resultIndex||0;i<event.results.length;i++){const result=event.results[i];text+=String(result?.[0]?.transcript||'');if(result?.isFinal)isFinal=true}text=text.trim();if(!text||!runningRef.current)return;if(state==='speaking'){try{window.speechSynthesis?.cancel()}catch{};busyRef.current=false}setUserTranscript(text.slice(-900));if(!isFinal)return;try{await askHugo(text)}catch{await recover()}};recognition.onerror=(event:any)=>{if(!runningRef.current)return;const code=String(event?.error||'');if(code==='no-speech'||code==='aborted'){window.setTimeout(startRecognition,140);return}if(code==='not-allowed'||code==='audio-capture'){runningRef.current=false;setError(COPY[localeRef.current].mic);setState('error');return}busyRef.current=false;setAssistantTranscript(COPY[localeRef.current].voiceInterrupted);window.setTimeout(startRecognition,220)};recognition.onend=()=>{if(runningRef.current&&!busyRef.current)window.setTimeout(startRecognition,80)};setAssistantTranscript(welcome);setState('ready');window.setTimeout(startRecognition,50)
 },[accessToken,askHugo,recover,startRecognition,state])

 return{state,error,userTranscript,assistantTranscript,transcript:assistantTranscript,active:state!=='idle'&&state!=='error',connect,disconnect}
}
