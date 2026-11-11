/**
 * UGO TEST Pix read-only provider proof. No charge creation, split or payout.
 * Both the Supabase user and the service must be authenticated, and the
 * payment from isolated Neon TEST must match the same client/provider/amount.
 */
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const PAYMENT_ID=/^[A-Za-z0-9_-]{1,100}$/
export const TEST_SUPABASE_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'

export function isApprovedOrigin(origin,allowed){
 if(typeof origin!=='string'||!origin)return true // Non-browser clients still require a valid JWT
 if(typeof allowed!=='string'||!allowed)return false
 return allowed.split(',').some(entry=>{
  const candidate=entry.trim()
  if(!/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(candidate))return false
  return origin===candidate
 })
}

export function authorizedProviderService(service,userId,serviceId,allowedIds){
 if(!UUID.test(userId||'')||!UUID.test(serviceId||'')||
    !service||service.id!==serviceId||service.proveedor_id!==userId||
    !UUID.test(service.cliente_id||''))return false
 const allowed=String(allowedIds||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)
 if(!allowed.includes(serviceId.toLowerCase()))return false
 const metadata=service.metadata||{}
 const method=String(metadata.requested_payment_method||metadata.payment_method||'').toLowerCase()
 const amount=Number(service.tarifa)
 return service.ambiente==='demo'&&service.moneda==='BRL'&&
   ['esperando_aprobacion','completado'].includes(service.estado)&&
   metadata.pix_after_service_authorized===true&&
   metadata.payment_timing==='after_service'&&method==='pix'&&
   Number.isFinite(amount)&&amount>0&&amount<=2000&&
   Number.isSafeInteger(Math.round(amount*100))&&
   Math.abs(amount*100-Math.round(amount*100))<1e-7
}

export function verifiedIntentForService(intent,service,userId){
 if(!intent||!service||!UUID.test(userId||''))return false
 if(intent.ugo_service_id!==service.id||intent.ugo_provider_id!==userId||
    intent.ugo_client_id!==service.cliente_id||
    intent.environment!=='sandbox')return false
 const gross=Math.round(Number(service.tarifa)*100)
 return Number(intent.gross_cents)===gross&&
    intent.provider_share_bps===8500&&
    intent.external_reference==='ugo_pix_test_'+service.id.replace(/-/g,'')&&
    typeof intent.asaas_customer_id==='string'&&
    /^cus_[A-Za-z0-9_-]{1,96}$/.test(intent.asaas_customer_id)
}

export function verifiedProcessorPayment(payment,intent){
 if(!payment||!intent||!PAYMENT_ID.test(intent.asaas_payment_id||''))return false
 return payment.id===intent.asaas_payment_id&&
   payment.customer===intent.asaas_customer_id&&
   payment.externalReference===intent.external_reference&&
   payment.billingType==='PIX'&&Number.isFinite(Number(payment.value))&&
   Math.round(Number(payment.value)*100)===Number(intent.gross_cents)
}

export function pendingQrValid(qr){
 if(!qr||typeof qr.payload!=='string'||qr.payload.length<1||qr.payload.length>4096||
    typeof qr.encodedImage!=='string'||qr.encodedImage.length<1||qr.encodedImage.length>200000||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(qr.encodedImage))return false
 if(qr.expirationDate!==undefined&&qr.expirationDate!==null){
  const exp=Date.parse(qr.expirationDate)
  if(!Number.isFinite(exp)||exp<=Date.now())return false
 }
 return true
}
