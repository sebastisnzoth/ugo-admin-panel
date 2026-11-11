/**
 * Conservative TEST-only verification gate for an authenticated GET
 * /v3/payments/splits/paid/{id} response. It does not move funds.
 * Any undocumented shape, discrepancy or ambiguous status blocks settlement.
 * Escrow balance availability is explicitly outside this verifier.
 */
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const MONEY=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&
 Math.abs(Math.round(n*100)-n*100)<1e-7

export function verifyAuthenticatedPaidSplit({response,expected}={}){
 if(!expected||!UUID.test(expected.splitId||'')||
   !UUID.test(expected.providerWalletId||'')||
   typeof expected.paymentId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(expected.paymentId)||
   expected.providerShareBps!==8500||
   !Number.isSafeInteger(expected.netCents)||expected.netCents<=0)
   throw Error('Invalid server-trusted split expectations')
 if(!response||response.id!==expected.splitId||
   response.walletId?.toLowerCase()!==expected.providerWalletId.toLowerCase()||
   response.payment?.id!==expected.paymentId||
   response.percentualValue!==85)
   throw Error('Authenticated Asaas split identity or destination mismatch')
 if(!['PENDING','AWAITING_CREDIT','DONE','CANCELLED','REFUSED','REFUNDED'].includes(response.status))
   throw Error('Unknown authenticated Asaas split status')
 if(response.status==='REFUNDED'||response.status==='CANCELLED'||response.status==='REFUSED')
   return Object.freeze({kind:'review',status:response.status,splitSettled:false,escrowAvailable:false})
 if(response.status!=='DONE')
   return Object.freeze({kind:'pending',status:response.status,splitSettled:false,escrowAvailable:false})
 // Do not infer a settled amount from the webhook itself. Require the
 // processor to return an exact two-decimal split amount for this recipient.
 if(!MONEY(response.totalValue)||response.totalValue===0)
   throw Error('Missing paid split amount from authenticated Asaas response')
 const cents=Math.round(response.totalValue*100)
 const expectedCents=Math.round(expected.netCents*85/100)
 if(cents!==expectedCents)throw Error('Authenticated Asaas split amount mismatch')
 return Object.freeze({kind:'settled',status:'DONE',
   netAmountCents:cents,splitSettled:true,escrowAvailable:false})
}
