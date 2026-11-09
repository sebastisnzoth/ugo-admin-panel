import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8')

test('P0 #3133: client onboarding data timeout fails closed without resetting the session or form',async()=>{
 const s=await read('src/features/client/onboarding/ClientOnboardingGate.tsx')
 assert.match(s,/\[loadError,setLoadError\]=useState\(false\)/)
 assert.match(s,/setLoading\(true\);setLoadError\(false\);setMsg\(''\);try\{/)
 assert.match(s,/if\(ue\)throw ue;if\(pe\)throw pe;/)
 assert.match(s,/catch\(e\)\{setLoadError\(true\);setMsg\(t\('clientOnboarding\.syncError'\)\)\}/)
 const failurePage=s.indexOf('if(loadError)return')
 const successPage=s.indexOf('if(complete)return')
 const formPage=s.indexOf('<form className="ugo-client-onboarding-card"')
 assert.ok(failurePage>0&&failurePage<successPage&&successPage<formPage,
  'onboarding read errors must take precedence over blank/unfinished form')
 assert.match(s.slice(failurePage,successPage),/onClick=\{\(\)=>void load\(\)\}/)
 assert.doesNotMatch(s.slice(failurePage,successPage),/auth\.signOut|setSession\(null\)|completar_onboarding_cliente/)
})

test('P0 #3133: fixed-price Pix choice remains selected but requires processor-confirmed funding before departure',async()=>{
 const [job,provider,translations,sql]=await Promise.all([
  read('src/mvp/provider/ProviderActiveJob.tsx'),
  read('src/mvp/provider/providerData.tsx'),
  read('src/i18n/translations/coreBase.ts'),
  read('supabase/migrations/20260930185000_variable_price_payment_preference.sql')
 ])
 assert.match(job,/pixSelectedAwaitingPayment=amountReady&&requestedPaymentMethod==='pix'&&!d\.funded/)
 assert.match(job,/paymentReady=d\.funded\|\|d\.cashSelected\|\|d\.paymentPreferenceSelected/)
 assert.match(job,/s\.estado==='asignado'&&!paymentReady/)
 assert.match(job,/s\.estado==='asignado'&&paymentReady/)
 assert.match(job,/providerJob\.pixSelectedAwaitingPaymentHelp/)
 assert.match(provider,/paymentPreferenceSelected=Boolean\(service&&!amountReady&&\['efectivo','pix'\]\.includes\(effectivePaymentMethod\)\)/)
 assert.match(provider,/service\.estado==='asignado'&&state==='en_camino'&&!funded&&!cashSelected&&!paymentPreferenceSelected/)
 assert.match(sql,/requested_payment_method/)
 for(const key of ['providerJob.pixSelectedAwaitingPayment','providerJob.pixSelectedAwaitingPaymentHelp'])
  assert.equal(translations.split('"'+key+'":').length-1,3,'must translate '+key+' to three locales')
 // The correct restriction: fixed-price Pix selection is not a completed charge.
 const canDepart=({amount,method,funded,cashSelected})=>funded||cashSelected||(amount<=0&&['pix','efectivo'].includes(method))
 assert.equal(canDepart({amount:120,method:'pix',funded:false,cashSelected:false}),false)
 assert.equal(canDepart({amount:0,method:'pix',funded:false,cashSelected:false}),true)
 assert.equal(canDepart({amount:120,method:'pix',funded:true,cashSelected:false}),true)
})
