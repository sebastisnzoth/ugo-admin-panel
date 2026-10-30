import React,{useState,useEffect,useRef} from 'react'
import './UgoSupportChat.css'

type Message={role:'user'|'assistant';content:string}
const initial:Message={role:'assistant',content:'Olá! 👋 Sou o atendimento virtual UGO. Posso ajudar clientes e profissionais com dúvidas sobre Faxina, Marido de Aluguel e o funcionamento da plataforma.'}
const endpoint='/api/ugo-support'
const turnstileSiteKey=import.meta.env.VITE_UGO_SUPPORT_TURNSTILE_SITE_KEY as string|undefined
type TurnstileApi={render:(element:HTMLElement,options:{sitekey:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void})=>string;reset:(id:string)=>void;remove:(id:string)=>void}
declare global {interface Window {turnstile?:TurnstileApi}}

export function UgoSupportChat(){
 const [open,setOpen]=useState(false)
 const [messages,setMessages]=useState<Message[]>([initial])
 const [input,setInput]=useState('')
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 const bottom=useRef<HTMLDivElement>(null)
 const controller=useRef<AbortController|null>(null)
 const captchaNode=useRef<HTMLDivElement>(null)
 const captchaId=useRef<string|null>(null)
 const [captchaToken,setCaptchaToken]=useState('')
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
  if(!text||busy||(turnstileSiteKey&&!captchaToken))return
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
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:next.slice(-12).map(m=>({role:m.role,content:m.content.slice(0,2000)})),channel:'landing',locale:navigator.language,turnstileToken:captchaToken}),signal:abort.signal,credentials:'omit'})
   if(!response.ok)throw new Error('Atendimento indisponível')
   const data:unknown=await response.json()
   const reply=(data&&typeof data==='object'&&'reply'in data)?(data as {reply:unknown}).reply:null
   if(typeof reply!=='string'||!reply.trim())throw new Error('Resposta inválida')
   setMessages(old=>[...old,{role:'assistant',content:reply.slice(0,5000)}])
  }catch(e){setNotice(abort.signal.aborted?'O atendimento está demorando mais que o normal. Tente novamente em instantes.':'Não foi possível conectar ao atendimento. Tente novamente mais tarde.')}
  finally{window.clearTimeout(timeoutId);setBusy(false);if(controller.current===abort)controller.current=null;if(captchaId.current&&window.turnstile)window.turnstile.reset(captchaId.current);setCaptchaToken('')}
 }
 return <div className="ugo-support-root">
  {open&&<section className="ugo-support-panel" role="dialog" aria-label="Atendimento UGO">
   <header className="ugo-support-header"><div><strong>Atendimento UGO</strong><small>Assistente virtual · Clientes e profissionais</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar atendimento">×</button></header>
   <div className="ugo-support-messages" role="log" aria-live="polite">
    {messages.map((message,i)=><p key={i} className={'ugo-support-bubble '+message.role}>{message.content}</p>)}
    {busy&&<p className="ugo-support-bubble assistant">Escrevendo…</p>}
    {notice&&<p className="ugo-support-notice" role="status">{notice}</p>}
    <div ref={bottom}/>
   </div>
   {turnstileSiteKey&&<div ref={captchaNode} style={{display:'flex',justifyContent:'center',padding:'6px'}} aria-label="Verificação anti-bot"/>}
   <form className="ugo-support-form" onSubmit={submit}><label className="ugo-support-sr" htmlFor="ugo-support-input">Sua mensagem</label><input id="ugo-support-input" value={input} onChange={e=>setInput(e.target.value)} maxLength={2000} placeholder="Como podemos ajudar?" disabled={busy}/><button type="submit" disabled={!input.trim()||busy||Boolean(turnstileSiteKey&&!captchaToken)} aria-label="Enviar mensagem">➤</button></form>
   <small className="ugo-support-footer">Não compartilhe senhas ou dados bancários.</small>
  </section>}
  <button className="ugo-support-launcher" type="button" onClick={()=>setOpen(v=>!v)} aria-label={open?'Fechar chat de atendimento':'Abrir chat de atendimento'} aria-expanded={open}>{open?'×':'☏'}<span>{open?'Fechar':'Atendimento IA'}</span></button>
 </div>
}
