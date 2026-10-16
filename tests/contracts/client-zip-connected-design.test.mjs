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
 assert.match(shell,/ugo:client-menu-open/)
})
test('ZIP navigation uses real request, history, profile, map and payment actions, not mock state',()=>{
 assert.match(shell,/screen:'payments'/)
 assert.match(root,/ClientZipPayments/)
 assert.match(root,/ClientZipExplore/)
 assert.match(root,/ClientZipActive/)
 assert.match(shell,/navigate\('explore'\)/)
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

test('ZIP Explore, Active and Payments use UGO TEST operational sources instead of the static ZIP records',()=>{
 const explore=readFileSync('src/features/client/explore/ClientZipExplore.tsx','utf8')
 const active=readFileSync('src/features/client/active/ClientZipActive.tsx','utf8')
 const payments=readFileSync('src/features/client/payments/ClientZipPayments.tsx','utf8')
 assert.match(explore,/from'\.\.\/radar\/providerRadarStore'/)
 assert.match(explore,/\.from\('categorias'\)/)
 assert.match(explore,/estado_verificacion!=='verificado'/)
 assert.match(explore,/flow\.publishHugoIntent/)
 assert.match(active,/\.from\('servicios'\)/)
 assert.match(active,/\.eq\('cliente_id',session\.user\.id\)/)
 assert.match(active,/postgres_changes/)
 assert.match(active,/openService\(s\.id\)/)
 assert.match(payments,/\.from\('preferencias_pago_cliente'\)/)
 assert.match(payments,/set_preorder_payment_preference/)
 for(const source of [explore,active,payments]){
  assert.doesNotMatch(source,/Roberto Silva|Ana Martínez|UGO-2048|R\\$ 145,00/)
 }
})
