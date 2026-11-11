import React,{useEffect,useState} from 'react'
import{useLocale}from'../i18n/locale'
import{isPixProviderIssuePreviewEnabled}from'../lib/featureFlags'
import {ProviderPixAfterService,type ProviderPixView} from './ProviderPixAfterService'

/**
 * Preview-only QR and explicitly user-triggered Sandbox charge.
 * Never sends operator secrets, infers payout or authorizes PROD billing.
 */
function providerTestEndpoint(serviceId:string):URL|null{
 const base=String(import.meta.env.VITE_UGO_PIX_SANDBOX_API_BASE_URL||'').replace(/\/$/,'')
 try{
  const parsed=new URL(base)
  if(parsed.protocol!=='https:'||
     !parsed.hostname.startsWith('ugo-pagamentos-v2-sandbox-')||
     !parsed.hostname.endsWith('.vercel.app')||parsed.pathname!=='/'||
     !/^[0-9a-f-]{36}$/i.test(serviceId))return null
  const endpoint=new URL('/api/provider-checkout',parsed.origin)
  endpoint.searchParams.set('serviceId',serviceId)
  return endpoint
 }catch{return null}
}
export function ProviderDeferredPixStatus({
 serviceId,serviceState,amountBRL,accessToken,workApproved,
}:{serviceId:string;serviceState:string;amountBRL:number;accessToken:string;workApproved:boolean}){
 const{t}=useLocale()
 const [payment,setPayment]=useState<ProviderPixView>({stage:'not_finished',amountBRL})
 const [revision,setRevision]=useState(0)
 const [copyFailed,setCopyFailed]=useState(false)
 const [issuing,setIssuing]=useState(false)
 const issuanceEnabled=isPixProviderIssuePreviewEnabled()
 const finished=serviceState==='esperando_aprobacion'||serviceState==='completado'
 const readyForPix=finished&&workApproved
 useEffect(()=>{
  let alive=true,timer:number|undefined
  const controller=new AbortController()
  if(!readyForPix){
   setPayment({stage:finished?'awaiting_approval':'not_finished',amountBRL})
   return()=>{alive=false;controller.abort()}
  }
  const endpoint=providerTestEndpoint(serviceId)
  if(!endpoint||!accessToken){
   setPayment({stage:'error',amountBRL})
   return()=>{alive=false;controller.abort()}
  }
  const endpointUrl=endpoint.toString()
  const refresh=async()=>{
   if(!alive||controller.signal.aborted||document.hidden||!navigator.onLine)return
   setPayment(current=>current.stage==='received'?current:
     {...current,stage:'loading',qrImageBase64:undefined,qrCopyPaste:undefined})
   try{
    const response=await fetch(endpointUrl,{method:'GET',headers:{
     Authorization:'Bearer '+accessToken,Accept:'application/json',
    },cache:'no-store',signal:controller.signal})
    const payload=await response.json().catch(()=>null)
    if(!alive||controller.signal.aborted)return
    if(!response.ok||payload?.environment!=='sandbox'||
       !['not_issued','awaiting_payment','confirming','received'].includes(payload?.stage)||
       !Number.isFinite(Number(payload?.amountBRL))||
       Math.abs(Number(payload.amountBRL)-amountBRL)>0.009){
     setPayment({stage:'error',amountBRL})
    }else if(payload.stage==='not_issued'){
     setPayment({stage:'not_issued',amountBRL})
    }else if(payload.stage==='received'){
     setPayment({stage:'received',amountBRL})
     return
    }else if(payload.stage==='awaiting_payment'){
     const expires=payload.expiresAt?Date.parse(payload.expiresAt):null
     if(expires!==null&&(!Number.isFinite(expires)||expires<=Date.now())){
      setPayment({stage:'expired',amountBRL})
     }else{
      setPayment({stage:'awaiting_payment',amountBRL,
       qrImageBase64:payload.qrImageBase64,qrCopyPaste:payload.qrCopyPaste,
       expiresAt:payload.expiresAt||null})
     }
    }else setPayment({stage:'confirming',amountBRL})
   }catch{
    if(alive&&!controller.signal.aborted)setPayment({stage:'error',amountBRL})
   }
   if(alive&&!controller.signal.aborted)
    timer=window.setTimeout(()=>void refresh(),20000)
  }
  void refresh()
  const visible=()=>{if(document.visibilityState==='visible'){
   if(timer)window.clearTimeout(timer)
   void refresh()
  }}
  const online=()=>{if(timer)window.clearTimeout(timer);void refresh()}
  document.addEventListener('visibilitychange',visible)
  window.addEventListener('online',online)
  return()=>{
   alive=false
   controller.abort()
   if(timer)window.clearTimeout(timer)
   document.removeEventListener('visibilitychange',visible)
   window.removeEventListener('online',online)
  }
 },[serviceId,serviceState,finished,readyForPix,amountBRL,accessToken,revision])
 useEffect(()=>{
  if(payment.stage!=='awaiting_payment'||!payment.expiresAt)return
  const expires=Date.parse(payment.expiresAt)
  if(!Number.isFinite(expires))return
  const delay=Math.min(Math.max(expires-Date.now(),0),2147483647)
  const timer=window.setTimeout(()=>setPayment(p=>p.stage==='awaiting_payment'?
   {stage:'expired',amountBRL}:p),delay)
  return()=>window.clearTimeout(timer)
 },[payment.stage,payment.expiresAt,amountBRL])
 const create=async()=>{
  if(!readyForPix||!issuanceEnabled||issuing||payment.stage!=='not_issued'||!accessToken)return
  const endpoint=providerTestEndpoint(serviceId)
  if(!endpoint){setPayment({stage:'error',amountBRL});return}
  setIssuing(true)
  try{
   const response=await fetch(endpoint.toString(),{
    method:'POST',headers:{
     Authorization:'Bearer '+accessToken,Accept:'application/json',
     'Content-Type':'application/json'
    },cache:'no-store',body:JSON.stringify({action:'create',serviceId})
   })
   if(!response.ok){setPayment({stage:'error',amountBRL});return}
   // Backend independently verifies Asaas and owns the transaction lock.
   setRevision(n=>n+1)
  }catch{setPayment({stage:'error',amountBRL})}
  finally{setIssuing(false)}
 }
 const copy=(value:string)=>{
  setCopyFailed(false)
  void navigator.clipboard.writeText(value).catch(()=>setCopyFailed(true))
 }
 return <>
  <ProviderPixAfterService payment={payment} onRefresh={()=>setRevision(n=>n+1)}
   onCopy={payment.stage==='awaiting_payment'?copy:undefined}/>
  {issuanceEnabled&&readyForPix&&payment.stage==='not_issued'&&
   <button type="button" onClick={()=>void create()} disabled={issuing}>
    {issuing?t('clientPayment.preparingPix'):(t('clientPayment.generatePix'))}
   </button>}
  {copyFailed&&<p role="alert">{t('clientPayment.copyFailed')}</p>}
 </>
}
