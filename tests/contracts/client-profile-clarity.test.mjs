import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const profile=readFileSync('src/features/client/profile/ClientProfilePanel.tsx','utf8')
const location=readFileSync('src/features/client/request/ClientLocationScreen.tsx','utf8')
test('profile starts with closed sections, distinguishes payment load errors and unsaved preferences',()=>{
 assert.doesNotMatch(profile,/<details id="ugo-client-profile-(?:payment|addresses)-section" open>/)
 assert.match(profile,/useState<PaymentMethod\|null>\(null\)/)
 assert.match(profile,/paymentState==='error'/)
 assert.match(profile,/clientProfileUx\.paymentHelp/)
 assert.match(profile,/aria-pressed=\{paymentMethod==='pix'\}/)
})
test('photo preview precedes upload and unsaved edits receive a leave warning',()=>{
 assert.match(profile,/if\(file\)selectPhoto\(file\)/)
 assert.match(profile,/URL\.createObjectURL\(pendingPhoto\)/)
 assert.match(profile,/uploadProfilePhoto\(pendingPhoto\)/)
 assert.match(profile,/beforeunload/)
 assert.match(profile,/await confirm\(\{title:t\('clientProfileUx\.discardTitle'\)/)
})
test('saved places are the editable source and legacy profile address is fallback only',()=>{
 const save=profile.slice(profile.indexOf(' const save=async'),profile.indexOf(' const choosePayment='))
 assert.doesNotMatch(save,/direccion:draft/)
 assert.match(profile,/clientProfileUx\.locationPending/)
 assert.match(location,/if\(profileAddress&&rows\.length===0\)/)
})

test('client navigation waits for profile discard confirmation, including service notices and logout',()=>{
 const flow=readFileSync('src/features/client/flow/clientFlow.tsx','utf8')
 const root=readFileSync('src/features/client/ClientRoot.tsx','utf8')
 const nav=readFileSync('src/features/client/navigation/useClientRootNavigation.ts','utf8')
 const menu=readFileSync('src/features/client/ui/ClientGlobalMenu.tsx','utf8')
 assert.match(profile,/flow\.registerLeaveGuard\(canLeave\)/)
 assert.match(flow,/requestLeave\(\)\.then\(ok=>\{if\(ok\)apply\(\)\}\)/)
 assert.match(flow,/beforeNavigate\?\.\(\)/)
 assert.match(nav,/destination\.kind==='service'/)
 assert.match(root,/confirmServiceOpen:flow\.requestLeave/)
 assert.match(menu,/if\(!await flow\.requestLeave\(\)\)return/)
})
