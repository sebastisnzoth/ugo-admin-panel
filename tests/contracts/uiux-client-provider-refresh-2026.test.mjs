import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('shared UX layer exposes connectivity, focus and skeleton primitives once',async()=>{
 const[barrel,banner,hook,focus,focusHook,main]=await Promise.all([
  read('src/shared/ux/index.ts'),
  read('src/shared/ux/ConnectionBanner.tsx'),
  read('src/shared/ux/useNetworkStatus.ts'),
  read('src/shared/ux/Skeleton.tsx'),
  read('src/shared/ux/useScreenFocus.ts'),
  read('src/main.tsx')
 ])
 for(const name of ['ConnectionBanner','ScreenAnnouncer','Skeleton','SkeletonCard','SkeletonList','SkeletonText','useNetworkStatus','useScreenFocus'])assert.match(barrel,new RegExp(`\\b${name}\\b`))
 assert.match(banner,/role="status"/)
 assert.match(banner,/aria-live="polite"/)
 assert.match(banner,/Sin conexión/)
 assert.match(banner,/onRestored/)
 assert.match(hook,/addEventListener\('online'/)
 assert.match(hook,/addEventListener\('offline'/)
 assert.match(focus,/ugo-ux-skeleton/)
 assert.match(focusHook,/prefers-reduced-motion|scrollTo/)
 assert.match(main,/shared\/ux\/ux-refresh\.css/)
})

test('both role shells announce the screen change and keep connectivity honest',async()=>{
 const[client,provider,announcer]=await Promise.all([
  read('src/features/client/ClientRoot.tsx'),
  read('src/mvp/provider/ProviderRoot.tsx'),
  read('src/shared/ux/ScreenAnnouncer.tsx')
 ])
 assert.match(client,/useScreenFocus\(flow\.screen\)/)
 assert.match(client,/<ConnectionBanner\/>/)
 assert.match(client,/<ScreenAnnouncer label=/)
 assert.match(provider,/useScreenFocus\(screen\)/)
 assert.match(provider,/ConnectionBanner onRestored=/)
 assert.match(provider,/<ScreenAnnouncer label=/)
 assert.match(announcer,/ugo-ux-sr-only/)
})

test('client home shows real loading, order progress and repeat-last-service',async()=>{
 const[home,css,styles]=await Promise.all([
  read('src/features/client/home/ClientHomeScreen.tsx'),
  read('src/features/client/ui/clientUxRefresh.css'),
  read('src/features/client/clientStyles.ts')
 ])
 assert.match(home,/data-ux-screen-heading/)
 assert.match(home,/SkeletonCard/)
 assert.match(home,/ugo-home-order-steps/)
 assert.match(home,/orderStage\(/)
 assert.match(home,/ugo-home-repeat/)
 assert.match(home,/ugo-home-categories-empty/)
 assert.match(home,/publishHugoIntent/)
 assert.match(styles,/\.\/ui\/clientUxRefresh\.css/)
 assert.match(css,/--ugo-ux-connection-bottom/)
 assert.match(css,/\.ugo-home-order-steps/)
 assert.match(css,/prefers-reduced-motion/)
})

test('provider home explains availability and surfaces demand without new business actions',async()=>{
 const home=await read('src/mvp/provider/ProviderHome.tsx')
 assert.match(home,/provider-status-card/)
 assert.match(home,/provider-status-facts/)
 assert.match(home,/provider-radar-glance/)
 assert.match(home,/screenHeading/)
 assert.match(home,/flow\.actions\.openDemand/)
 assert.match(home,/Efectivo \{money\(d\.cashReceived\)\}/)
 assert.match(home,/Debés UGO \{money\(d\.ugoDebt\)\}/)
})

test('provider opportunity keeps deadline visible in list and detail',async()=>{
 const[list,css]=await Promise.all([
  read('src/mvp/provider/ProviderOpportunities.tsx'),
  read('src/mvp/provider/provider-ux-2026.css')
 ])
 assert.match(list,/Expira en \{formatCountdown\(left\)\}/)
 assert.match(list,/provider-offer-timer/)
 assert.match(list,/provider-decision-reasons/)
 assert.match(css,/\.ugo-provider-root \.provider-offer-timer\{/)
 assert.match(css,/\.ugo-provider-root \.provider-decision-reasons span\.is-urgent/)
 assert.match(css,/\.ugo-provider-root \.provider-opportunity-meta \.provider-chip\.is-expiring/)
})

test('provider active job keeps one next action reachable from a sticky bar',async()=>{
 const[job,css,styles]=await Promise.all([
  read('src/mvp/provider/ProviderActiveJob.tsx'),
  read('src/mvp/provider/provider-ux-2026.css'),
  read('src/features/provider/providerStyles.ts')
 ])
 assert.match(job,/provider-sticky-step/)
 assert.match(job,/provider-mission-brief/)
 assert.match(job,/provider-primary-control/)
 assert.match(css,/\.ugo-provider-root \.provider-sticky-step\{/)
 assert.match(css,/bottom:calc\(84px \+ env\(safe-area-inset-bottom\)\)/)
 assert.match(css,/@media\(min-width:1000px\)/)
 assert.match(css,/prefers-reduced-motion/)
 assert.match(styles,/provider-ux-2026\.css/)
 assert.ok(styles.indexOf('provider-ux-2026.css')<styles.indexOf('provider-production-shell.css'))
})
