/**
 * Pure Asaas Sandbox charge issuance guards. Not a payout/split/escrow API.
 * Never approve a charge from caller-supplied amount, customer or wallet.
 */
import {UUID,PAYMENT_ID} from './providerPixProof.js'

export function finalEvidenceValid(rows){
 return Array.isArray(rows)&&rows.length===1&&
   typeof rows[0]?.storage_path==='string'&&rows[0].storage_path.trim().length>0
}
export function sandboxChargeSpec(service,customerId,clock=Date.now()){
 if(!UUID.test(service?.id||'')||!UUID.test(service?.cliente_id||'')||
    !UUID.test(service?.proveedor_id||'')||
    typeof customerId!=='string'||!/^cus_[A-Za-z0-9_-]{1,96}$/.test(customerId)||
    !Number.isFinite(clock))throw Error('invalid_sandbox_charge_identity')
 const grossCents=Math.round(Number(service.tarifa)*100)
 if(!Number.isSafeInteger(grossCents)||grossCents<100||grossCents>200000||
    Math.abs(Number(service.tarifa)*100-grossCents)>0.000001)
  throw Error('sandbox_charge_amount_invalid')
 const date=new Date(clock+7*24*60*60*1000).toISOString().slice(0,10)
 const externalReference='ugo_pix_test_'+service.id.replace(/-/g,'')
 return {grossCents,externalReference,customerId,
  paymentBody:{customer:customerId,billingType:'PIX',
   value:grossCents/100,dueDate:date,externalReference}}
}
export function remoteReferenceAbsent(payload,externalReference){
 if(!payload||!Array.isArray(payload.data)||payload.hasMore!==false)return false
 return payload.data.length===0
}
export function issuedChargeIdentityValid(charge,spec){
 if(!charge||!spec||!PAYMENT_ID.test(charge.id||'')||
    charge.customer!==spec.customerId||
    charge.externalReference!==spec.externalReference||
    charge.billingType!=='PIX'||charge.status!=='PENDING')return false
 return Number.isFinite(Number(charge.value))&&
  Math.round(Number(charge.value)*100)===spec.grossCents
}
