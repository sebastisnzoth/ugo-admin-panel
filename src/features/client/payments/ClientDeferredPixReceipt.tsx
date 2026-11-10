import React,{useEffect,useMemo,useState}from'react'
import{useLocale}from'../../../i18n/locale'
import{getRoleSupabase}from'../../../lib/roleSupabase'

/**
 * Preview-only receipt status from the exact existing Asaas charge.
 * No QR, no Pix creation and no trusted payment state in the browser.
 */
export function ClientDeferredPixReceipt({serviceId}:{serviceId:string}){
 const{t}=useLocale()
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[status,setStatus]=useState<'loading'|'not_issued'|'awaiting_payment'|'confirming'|'received'|'requires_review'|'error'>('loading')
 useEffect(()=>{
  let active=true,timer:number|undefined
  const controller=new AbortController()
  let endpoint:URL|null=null
  try{
   const base=String(import.meta.env.VITE_UGO_PIX_SANDBOX_API_BASE_URL||'')
   const parsed=new URL(base)
   if(parsed.protocol!=='https:'||
      !parsed.hostname.startsWith('ugo-pagamentos-v2-sandbox-')||
      !parsed.hostname.endsWith('.vercel.app')||parsed.pathname!=='/'||
      !/^[0-9a-f-]{36}$/i.test(serviceId))throw Error('bad_preview')
   endpoint=new URL('/api/client-checkout',parsed.origin)
   endpoint.searchParams.set('serviceId',serviceId)
  }catch{/* Preserve a safe, non-paid state. */}
  if(!endpoint){setStatus('error');return()=>{active=false;controller.abort()}}
  const uri=endpoint.toString()
  const reload=async()=>{
   if(!active||controller.signal.aborted||document.hidden||!navigator.onLine)return
   try{
    const{data:{session}}=await supabase.auth.getSession()
    if(!session?.access_token)throw Error('not_signed_in')
    const response=await fetch(uri,{method:'GET',headers:{
     Authorization:'Bearer '+session.access_token,Accept:'application/json',
    },cache:'no-store',signal:controller.signal})
    const row=await response.json().catch(()=>null)
    if(!active||controller.signal.aborted)return
    if(!response.ok||row?.environment!=='sandbox'){
     setStatus('error')
    }else if(row.stage==='received'&&row.paymentVerified===true){
     setStatus('received')
     return
    }else if(['not_issued','awaiting_payment','confirming','requires_review'].includes(row.stage))
     setStatus(row.stage)
    else setStatus('error')
   }catch{if(active&&!controller.signal.aborted)setStatus('error')}
   if(active&&!controller.signal.aborted)timer=window.setTimeout(()=>void reload(),20000)
  }
  void reload()
  const onVisible=()=>{if(document.visibilityState==='visible'){if(timer)clearTimeout(timer);void reload()}}
  const onOnline=()=>{if(timer)clearTimeout(timer);void reload()}
  document.addEventListener('visibilitychange',onVisible)
  window.addEventListener('online',onOnline)
  return()=>{
   active=false;controller.abort()
   if(timer)clearTimeout(timer)
   document.removeEventListener('visibilitychange',onVisible)
   window.removeEventListener('online',onOnline)
  }
 },[serviceId,supabase])
 const label=status==='received'?t('clientPayment.paidAlready'):
  status==='awaiting_payment'?t('clientPayment.pixPending'):
  status==='not_issued'?t('clientPayment.pixSelected'):
  status==='confirming'||status==='loading'?t('clientPayment.preparingPix'):
  t('clientPayment.updateFailed')
 return <div className="ugo-client-deferred-pix-receipt" role="status" aria-live="polite">
  <strong>{label}</strong>
 </div>
}
