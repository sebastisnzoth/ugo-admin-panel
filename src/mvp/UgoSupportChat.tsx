import React,{useState,useEffect,useRef} from 'react'
import './UgoSupportChat.css'
import {useLocale} from '../i18n/locale'

type Message={role:'user'|'assistant';content:string}
const initial:Message={role:'assistant',content:'Olá! 👋 Sou o atendimento virtual UGO. Posso ajudar clientes e profissionais com dúvidas sobre Faxina, Marido de Aluguel e o funcionamento da plataforma.'}
const endpoint='/api/ugo-support'
const turnstileSiteKey=import.meta.env.VITE_UGO_SUPPORT_TURNSTILE_SITE_KEY as string|undefined
type TurnstileApi={render:(element:HTMLElement,options:{sitekey:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void})=>string;reset:(id:string)=>void;remove:(id:string)=>void}
declare global {interface Window {turnstile?:TurnstileApi}}

const labels={
 pt:{header:'Atendimento UGO',subtitle:'Assistente virtual · Clientes e profissionais',close:'Fechar atendimento',typing:'Escrevendo…',input:'Sua mensagem',placeholder:'Como podemos ajudar?',send:'Enviar mensagem',footer:'Não compartilhe senhas ou dados bancários.',launcher:'Atendimento IA',closed:'Fechar',open:'Abrir chat de atendimento',captcha:'Verificação anti-bot',providerLink:'Abrir aplicativo profissional',clientLink:'Abrir aplicativo do cliente'},
 es:{header:'Atención UGO',subtitle:'Asistente virtual · Clientes y profesionales',close:'Cerrar atención',typing:'Escribiendo…',input:'Tu mensaje',placeholder:'¿Cómo podemos ayudarte?',send:'Enviar mensaje',footer:'No compartas contraseñas ni datos bancarios.',launcher:'Atención IA',closed:'Cerrar',open:'Abrir chat de atención',captcha:'Verificación antibots',providerLink:'Abrir aplicación profesional',clientLink:'Abrir aplicación cliente'},
 en:{header:'UGO Support',subtitle:'Virtual assistant · Customers and professionals',close:'Close support',typing:'Typing…',input:'Your message',placeholder:'How can we help?',send:'Send message',footer:'Do not share passwords or banking information.',launcher:'AI Support',closed:'Close',open:'Open support chat',captcha:'Bot verification',providerLink:'Open professional app',clientLink:'Open customer app'}
} as const

const officialRoutes=['https://ugo-admin-panel.vercel.app/?app=client','https://ugo-admin-panel.vercel.app/?app=provider'] as const
function renderSupportText(content:string,routeLabels:{providerLink:string;clientLink:string}){
 const pieces=content.split(/(https:\/\/ugo-admin-panel\.vercel\.app\/\?app=(?:client|provider))/g)
 return pieces.map((part,i)=>officialRoutes.some(route=>route===part)
  ?<a key={i} href={part} target="_blank" rel="noopener noreferrer">{part.includes('provider')?routeLabels.providerLink:routeLabels.clientLink}</a>
  :<React.Fragment key={i}>{part}</React.Fragment>)
}

export function UgoSupportChat(){
 const {locale}=useLocale();const t=labels[locale==='es'?'es':locale==='en'?'en':'pt'];
 const [open,setOpen]=useState(false)
 const [messages,setMessages]=useState<Message[]>([initial])
 useEffect(()=>{setMessages(current=>current.length===1?[{role:'assistant',content:locale==='es'?'¡Hola! Soy el asistente virtual de UGO. Puedo ayudarte como cliente o profesional.':locale==='en'?'Hello! I am the UGO virtual assistant. I can help customers and professionals.':initial.content}]:current)},[locale])
 const [input,setInput]=useState('')
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 const bottom=useRef<HTMLDivElement>(null)
 const controller=useRef<AbortController|null>(null)
 const captchaNode=useRef<HTMLDivElement>(null)
 const captchaId=useRef<string|null>(null)
 const [captchaToken,setCaptchaToken]=useState('')
 const [verifiedSession,setVerifiedSession]=useState(false)
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[messages,open])
 useEffect(()=>()=>controller.current?.abort(),[])
 useEffect(()=>{
  if(!open||!turnstileSiteKey)return
  let alive=true,interval:number|undefined
  const init=()=>{if(!alive||!captchaNode.current||captchaId.current||!window.turnstile)return;captchaId.current=window.turnstile.render(captchaNode.current,{sitekey:turnstileSiteKey,callback:setCaptchaToken,'expired-callback':()=>setCaptchaToken(''),'error-callback':()=>setCaptchaToken('')})}
  const scriptId='ugo-turnstile-sdk';let script=document.getElementById(scriptId) as HTMLScriptElement|null
  if(!script){script=document.createElement('script');script.id=scriptId;script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;document.head.appendChild(script)}
  interval=window.setInterval(init,250);init()
  return()=>{alive=false;if(interval)clearInterval(interval);if(captchaId.current&&window.turnstile){window.turnstile.remove(captchaId.current);captchaId.current=null}setCaptchaToken('')}
 },[open])
 async function submit(event:React.FormEvent){
  event.preventDefault()
  const text=input.trim()
  if(!text||busy||(turnstileSiteKey&&!verifiedSession&&!captchaToken))return
  setInput('')
  setNotice('')
  const next=[...messages,{role:'user' as const,content:text}]
  setMessages(next)
  if(!endpoint){setNotice('O atendimento por IA ainda não está disponível. Tente novamente mais tarde.');return}
  const abort=new AbortController()
  controller.current=abort
  const timeoutId=window.setTimeout(()=>abort.abort(),25000)
  setBusy(true)
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:next.slice(-12).map(m=>({role:m.role,content:m.content.slice(0,2000)})),channel:'landing',locale,turnstileToken:captchaToken}),signal:abort.signal,credentials:'same-origin'})
   if(!response.ok){
    if(response.status===404)throw new Error('Endpoint do atendimento não encontrado (404).')
    if(response.status===405)throw new Error('O servidor recusou o método da solicitação (405).')
    const body=await response.json().catch(()=>null) as {error?:string}|null
    if(response.status===429)throw new Error('Limite de mensagens atingido. Aguarde um minuto e tente novamente.')
    if(response.status===403){setVerifiedSession(false);if(captchaId.current&&window.turnstile)window.turnstile.reset(captchaId.current);setCaptchaToken('');throw new Error('Verificação de segurança recusada (HTTP 403).')}
    if(response.status===503)throw new Error('Serviço de segurança temporariamente indisponível (503).')
    if(response.status===502)throw new Error('Gemini ou servidor indisponível (502).')
    if(response.status===504)throw new Error('Tempo de resposta esgotado (504).')
    throw new Error(`Atendimento indisponível (HTTP ${response.status}${body?.error?' · '+body.error:''}).`)
   }
   const data:unknown=await response.json()
   const reply=(data&&typeof data==='object'&&'reply'in data)?(data as {reply:unknown}).reply:null
   if(typeof reply!=='string'||!reply.trim())throw new Error('Resposta inválida')
   if(turnstileSiteKey)setVerifiedSession(true)
   setCaptchaToken('')
   setMessages(old=>[...old,{role:'assistant',content:reply.slice(0,5000)}])
  }catch(e){setNotice(abort.signal.aborted?'O atendimento está demorando mais que o normal. Tente novamente em instantes.':e instanceof Error&&e.message!=='Failed to fetch'?e.message:'Não foi possível conectar ao atendimento. Tente novamente mais tarde.')}
  finally{window.clearTimeout(timeoutId);setBusy(false);if(controller.current===abort)controller.current=null;/* Keep the challenge stable on network errors; new token will be requested when used/expired. */}
 }
 return <div className="ugo-support-root">
  {open&&<section className="ugo-support-panel" role="dialog" aria-label={t.header}>
   <header className="ugo-support-header"><div><strong>{t.header}</strong><small>{t.subtitle}</small></div><button type="button" onClick={()=>setOpen(false)} aria-label={t.close}>×</button></header>
   <div className="ugo-support-messages" role="log" aria-live="polite">
    {messages.map((message,i)=><p key={i} className={'ugo-support-bubble '+message.role}>{message.role==='assistant'?renderSupportText(message.content,t):message.content}</p>)}
    {busy&&<p className="ugo-support-bubble assistant">{t.typing}</p>}
    {notice&&<p className="ugo-support-notice" role="status">{notice}</p>}
    <div ref={bottom}/>
   </div>
   {turnstileSiteKey&&<div ref={captchaNode} style={{display:verifiedSession?'none':'flex',justifyContent:'center',padding:'6px'}} aria-label={t.captcha}/>}
   <form className="ugo-support-form" onSubmit={submit}><label className="ugo-support-sr" htmlFor="ugo-support-input">{t.input}</label><input id="ugo-support-input" value={input} onChange={e=>setInput(e.target.value)} maxLength={2000} placeholder={t.placeholder} disabled={busy}/><button type="submit" disabled={!input.trim()||busy||Boolean(turnstileSiteKey&&!verifiedSession&&!captchaToken)} aria-label={t.send}>➤</button></form>
   <small className="ugo-support-footer">{t.footer}</small>
  </section>}
  <button className="ugo-support-launcher" type="button" onClick={()=>setOpen(v=>!v)} aria-label={open?t.close:t.open} aria-expanded={open}>{open?'×':'☏'}<span>{open?t.closed:t.launcher}</span></button>
 </div>
}
