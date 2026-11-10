/**
 * No credentials, no real event, no financial writes.
 * Verify the Asaas-facing Preview alias is reachable from GitHub runners and
 * that an unauthenticated webhook POST is rejected by our application (401).
 */
import assert from 'node:assert/strict'
const url='https://ugo-pagamentos-v2-sandbox-git-fe-ae9aa9-sebastisnzoths-projects.vercel.app/api/webhook'
const response=await fetch(url,{
 method:'POST',
 headers:{'Content-Type':'application/json'},
 body:JSON.stringify({id:'evt_ugo_unauthorized_connectivity_probe',event:'PAYMENT_RECEIVED',payment:{id:'pay_not_a_charge'}}),
 signal:AbortSignal.timeout(12000),
 redirect:'manual'
})
const type=response.headers.get('content-type')||''
const raw=await response.text()
let body={}
if(type.includes('application/json'))try{body=JSON.parse(raw)}catch{}
console.log(JSON.stringify({probe:'UGO_PIX_SANDBOX_WEBHOOK_REACHABILITY',httpStatus:response.status,contentType:type,applicationError:body?.error||null,financialWritesPerformed:false}))
assert.equal(response.status,401,'EXPECTED_APPLICATION_401: Preview alias inaccessible or webhook middleware misconfigured')
assert.equal(body?.error,'unauthorized','EXPECTED_APPLICATION_AUTH_GUARD')
