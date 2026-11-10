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

// Independently verify Neon TEST read-only availability and sandbox config.
// The health endpoint contains booleans only; never request or print secrets.
const healthResponse=await fetch(url.replace('/api/webhook','/api/health'),{
 method:'GET',signal:AbortSignal.timeout(12000),redirect:'manual'
})
assert.equal(healthResponse.status,200,'SANDBOX_HEALTH_NOT_READY')
const health=await healthResponse.json()
assert.equal(health.environment,'sandbox','NOT_ISOLATED_SANDBOX')
assert.equal(health.testDatabase,'ready','NEON_TEST_READONLY_NOT_READY')
assert.equal(health.role,'read_only','SANDBOX_HEALTH_ROLE_UNEXPECTED')
assert.equal(health.webhookInboxConfigured,true,'WEBHOOK_SECRET_NOT_CONFIGURED')
// This backend is an isolated operator-only test fixture, not user-authorized Pix.
assert.equal(health.providerAuthenticatedCheckoutReady,false,'UNREVIEWED_PROVIDER_CHECKOUT_FLAG')
console.log(JSON.stringify({probe:'UGO_PIX_SANDBOX_HEALTH',httpStatus:healthResponse.status,environment:health.environment,testDatabase:health.testDatabase,webhookInboxConfigured:health.webhookInboxConfigured,providerAuthenticatedCheckoutReady:health.providerAuthenticatedCheckoutReady,financialWritesPerformed:false}))

/*
 * The new Provider QR route must deny every browser/client request without
 * a valid TEST Provider JWT before it reads any payment or QR. This is only
 * a harmless GET against a synthetic UUID: never send an Asaas token.
 */
const noSessionResponse=await fetch(
 url.replace('/api/webhook','/api/provider-checkout?serviceId=11111111-1111-4111-8111-111111111111'),
 {method:'GET',signal:AbortSignal.timeout(12000),redirect:'manual'}
)
const noSessionBody=await noSessionResponse.json().catch(()=>null)
console.log(JSON.stringify({
 probe:'UGO_PIX_PROVIDER_JWT_AUTH_BOUNDARY',
 httpStatus:noSessionResponse.status,
 denied:noSessionBody?.error==='provider_session_required',
 financialWritesPerformed:false
}))
assert.equal(noSessionResponse.status,401,'PROVIDER_QR_MUST_REQUIRE_TEST_JWT')
assert.equal(noSessionBody?.error,'provider_session_required','PROVIDER_QR_AUTH_GUARD_NOT_ENFORCED')

/* Financial issuance is a second independent server-side switch.
 * A public POST must never create even a Sandbox payment by default. */
const disabledIssue=await fetch(url.replace('/api/webhook','/api/provider-checkout'),{
 method:'POST',
 headers:{'Content-Type':'application/json'},
 body:JSON.stringify({action:'create',serviceId:'11111111-1111-4111-8111-111111111111'}),
 signal:AbortSignal.timeout(12000),redirect:'manual'
})
const disabledBody=await disabledIssue.json().catch(()=>null)
console.log(JSON.stringify({probe:'UGO_PIX_PROVIDER_CREATE_DISABLED',
 httpStatus:disabledIssue.status,guard:disabledBody?.error||null,financialWritesPerformed:false}))
assert.equal(disabledIssue.status,503,'PROVIDER_ISSUE_FLAG_MUST_BE_OFF_BY_DEFAULT')
assert.equal(disabledBody?.error,'provider_issuance_disabled','UNEXPECTED_PROVIDER_ISSUE_ENABLEMENT')
