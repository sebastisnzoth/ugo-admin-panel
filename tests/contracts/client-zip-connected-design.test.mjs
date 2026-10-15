import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const root=readFileSync('src/features/client/ClientRoot.tsx','utf8')
const shell=readFileSync('src/features/client/ui/ClientZipShell.tsx','utf8')
const css=readFileSync('src/features/client/ui/clientZipDesign.css','utf8')
const home=readFileSync('src/features/client/home/ClientHomeScreen.tsx','utf8')

test('ZIP design is the actual client root, with real UGO operational screens retained',()=>{
 assert.match(root,/ClientZipShell/)
 for(const component of ['ClientHomeScreen','ClientNeedScreen','ClientHistoryOverlay','ClientProfilePanel','ClientGlobalSurfaces','ClientOrderDetailBoundary']){
  assert.match(root,new RegExp(component))
 }
 assert.match(shell,/useClientFlow/)
 assert.match(shell,/useRoleSession\('client'\)/)
 assert.match(shell,/flow\.navigate\(next\)/)
 assert.match(shell,/flow\.actions\.openDispute\(\)/)
})
test('ZIP navigation uses real request, history, profile, map and payment actions, not mock state',()=>{
 assert.match(shell,/document\.getElementById\('ugo-client-profile-payment-section'\)/)
 assert.match(shell,/\.ugo-home-services/)
 assert.match(shell,/\.ugo-home-location/)
 assert.match(shell,/\.ugo-notification-center\.role-client/)
 assert.doesNotMatch(shell,/Roberto Silva|Ana Martínez|UGO-2048|148 profesionales|setRequestStep/)
})
test('source ZIP visual tokens and layout remain scoped to Client without global resets',()=>{
 for(const color of ['#0c7c61','#075a48','#f4f7f5','#e2f2ec','#fa6b52'])assert.ok(css.includes(color),color)
 for(const selector of ['.ugo-zip-sidebar','.ugo-zip-topbar','.ugo-zip-hero','.ugo-zip-mobile-nav','.ugo-home-categories'])assert.ok(css.includes(selector),selector)
 assert.match(css,/@media\(max-width:600px\)/)
 assert.doesNotMatch(css,/@import "tailwindcss"/)
 assert.doesNotMatch(css,/^body\{/m)
})
test('home categories and providers still come from live stores and the order list never uses ZIP fake offers',()=>{
 assert.match(home,/from'\.\.\/radar\/providerRadarStore'/)
 assert.match(home,/from'\.\.\/flow\/clientFlow'/)
 assert.match(home,/orders\.map\(order/)
 assert.match(home,/categories\.map\(c=/)
 assert.match(home,/onlineProviders\.slice/)
})
