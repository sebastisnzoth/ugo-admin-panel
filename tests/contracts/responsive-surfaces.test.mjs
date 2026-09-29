import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('operational apps own mobile scrolling while the shared runtime locks the document',async()=>{
 const [runtime,client,provider,admin]=await Promise.all([
  read('src/mvp/mobile-runtime-fixes.css'),
  read('src/features/client/ui/clientResponsiveHardening.css'),
  read('src/mvp/provider/provider-responsive-hardening.css'),
  read('src/mvp/admin-responsive-hardening.css'),
 ])
 assert.match(runtime,/@media\(max-width:760px\)[\s\S]*html,body,#root\{[^}]*overflow:hidden!important/)
 assert.match(client,/@media\(max-width:760px\)[\s\S]*\.ugo-client-root\{[\s\S]*height:100dvh!important;[\s\S]*overflow-y:auto!important/)
 assert.match(provider,/@media\(max-width:760px\)[\s\S]*\.ugo-provider-root\{[\s\S]*height:100dvh!important;[\s\S]*overflow-y:auto!important/)
 assert.match(admin,/@media\(max-width:760px\)[\s\S]*\.ugo-admin2\{[\s\S]*height:100dvh!important;[\s\S]*overflow-y:auto!important/)
})

test('standalone and auxiliary surfaces also own phone scrolling',async()=>{
 const files=await Promise.all([
  read('src/mvp/ugo-landing.css'),
  read('src/mvp/provider-recruitment.css'),
  read('src/mvp/ugo-client-web.css'),
  read('src/mvp/ugo-web-responsive.css'),
  read('src/mvp/ugo-web-provider.css'),
  read('src/mvp/development-dashboard.css'),
  read('src/mvp/ugo-test-demo.css'),
 ])
 const roots=['.ugo-landing','.ugo-recruit','.ugo-client-web','.ugo-web','.ugo-web-provider','.devdash','.ugo-test-demo']
 roots.forEach((root,index)=>{
  assert.match(files[index],new RegExp(root.replaceAll('.','\\.')+'[^}]*height:100dvh[\\s\\S]*overflow-y:auto'),`${root} must own mobile scrolling`)
 })
})

test('short phone landscape has explicit coverage for app and auxiliary shells',async()=>{
 const paths=[
  'src/features/client/ui/clientResponsiveHardening.css',
  'src/mvp/provider/provider-responsive-hardening.css',
  'src/mvp/admin-responsive-hardening.css',
  'src/mvp/ugo-landing.css',
  'src/mvp/provider-recruitment.css',
  'src/mvp/ugo-client-web.css',
  'src/mvp/ugo-web-responsive.css',
  'src/mvp/ugo-web-provider.css',
  'src/mvp/development-dashboard.css',
  'src/mvp/ugo-test-demo.css',
 ]
 const files=await Promise.all(paths.map(read))
 files.forEach((css,index)=>{
  assert.match(css,/@media\(orientation:landscape\) and \(max-height:520px\) and \(max-width:950px\)/,`${paths[index]} must cover 844x390 and 915x412 phone landscape`)
 })
})

test('client and provider onboarding plus auth avoid mobile input zoom and preserve keyboard scroll',async()=>{
 const [clientOnboarding,providerOnboarding,auth,webAuth]=await Promise.all([
  read('src/features/client/onboarding/clientOnboarding.css'),
  read('src/mvp/provider-onboarding.css'),
  read('src/mvp/ugo-auth-redesign.css'),
  read('src/mvp/ugo-web-auth.css'),
 ])
 assert.match(clientOnboarding,/scroll-padding-bottom:120px/)
 assert.match(clientOnboarding,/\.ugo-client-field input,.ugo-client-field select\{min-height:52px;font-size:16px\}/)
 assert.match(providerOnboarding,/scroll-padding-bottom:96px/)
 assert.match(providerOnboarding,/@media\(max-width:640px\)[\s\S]*\.ugo-provider-field input,.ugo-provider-field select,.ugo-provider-field textarea\{font-size:16px\}/)
 assert.match(auth,/\.mvp-auth-page:not\(\.role-client\):not\(\.role-provider\)[\s\S]*overflow-y:auto/)
 assert.match(webAuth,/@media\(max-width:760px\)[\s\S]*\.uw-auth-panel input\{font-size:16px\}/)
})

test('fixed mobile navigation and Hugo reserve safe-area space instead of covering content',async()=>{
 const [client,provider,admin,clientWeb]=await Promise.all([
  read('src/features/client/ui/clientResponsiveHardening.css'),
  read('src/mvp/provider/provider-responsive-hardening.css'),
  read('src/mvp/admin-responsive-hardening.css'),
  read('src/mvp/ugo-client-web.css'),
 ])
 assert.match(client,/\.ugo-home-mobile-nav[\s\S]*bottom:max\(8px,env\(safe-area-inset-bottom\)\)/)
 assert.match(client,/\.prototype-hugo[\s\S]*bottom:calc\(94px \+ env\(safe-area-inset-bottom\)\)/)
 assert.match(provider,/\.provider-bottom-nav[\s\S]*bottom:max\(8px,env\(safe-area-inset-bottom\)\)/)
 assert.match(provider,/\.provider-global-hugo[\s\S]*bottom:calc\(96px \+ env\(safe-area-inset-bottom\)\)/)
 assert.match(admin,/\.hugo-free-trigger[\s\S]*bottom:calc\(84px \+ env\(safe-area-inset-bottom\)\)/)
 assert.match(clientWeb,/\.ucw-mobile-nav[\s\S]*bottom:max\(8px,env\(safe-area-inset-bottom\)\)/)
})

test('real client, provider and admin maps react to container and orientation changes',async()=>{
 const [clientMap,providerMap,adminMap]=await Promise.all([
  read('src/features/client/home/ClientHomeScreen.tsx'),
  read('src/mvp/provider/ProviderDemandMap.tsx'),
  read('src/components/MapaOperativo.tsx'),
 ])
 for(const source of [clientMap,providerMap,adminMap]){
  assert.match(source,/ResizeObserver/)
  assert.match(source,/orientationchange/)
  assert.match(source,/addEventListener\('resize'/)
 }
 assert.match(clientMap,/map\.resize\(\)/)
 assert.match(providerMap,/map\.resize\(\)/)
 assert.match(adminMap,/invalidateSize\(false\)/)
})

test('admin map collapses rails on phones and keeps the map canvas bounded',async()=>{
 const [map,admin]=await Promise.all([
  read('src/components/MapaOperativo.tsx'),
  read('src/mvp/admin-responsive-hardening.css'),
 ])
 assert.match(map,/className="ugo-admin-map"/)
 assert.match(map,/className="ugo-admin-map-filters"/)
 assert.match(map,/className="ugo-admin-map-stage"/)
 assert.match(map,/className="ugo-admin-map-detail"/)
 assert.match(admin,/@media\(max-width:760px\)[\s\S]*\.ugo-admin-map-body\{[\s\S]*flex-direction:column!important/)
 assert.match(admin,/\.ugo-admin-map-stage[\s\S]*min-height:360px!important/)
})
