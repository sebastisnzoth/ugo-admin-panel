import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

function hexLum(hex){
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4)
 return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]
}
function contrast(a,b){
 const[x,y]=[hexLum(a),hexLum(b)].sort((m,n)=>n-m)
 return(x+.05)/(y+.05)
}

test('UGO cyan identity keeps accessible contrast on white and on dark text',async()=>{
 const tokens=await read('src/styles/tokens.css')
 const primary=tokens.match(/--ugo-color-brand-500:(#[0-9a-fA-F]{6})/)?.[1]
 const accent=tokens.match(/--ugo-color-accent:(#[0-9a-fA-F]{6})/)?.[1]
 const onAccent=tokens.match(/--ugo-color-on-accent:(#[0-9a-fA-F]{6})/)?.[1]
 assert.ok(primary&&accent&&onAccent,'cyan tokens must exist')
 assert.ok(contrast(primary,'#ffffff')>=4.5,`brand-500 over white is ${contrast(primary,'#ffffff').toFixed(2)}:1`)
 assert.ok(contrast(accent,onAccent)>=4.5,`accent with on-accent is ${contrast(accent,onAccent).toFixed(2)}:1`)
 assert.ok(contrast(accent,'#ffffff')<4.5,'bright accent must never be used as text on white')
})

test('green is reserved for success now that the brand is cyan',async()=>{
 const[tokens,design]=await Promise.all([read('src/styles/tokens.css'),read('src/mvp/ugo-design-system.css')])
 assert.match(tokens,/--ugo-color-success:#067647/)
 assert.match(design,/--ugo-color-success:#067647/)
 assert.match(tokens,/--ugo-color-accent:#16c7d9/)
 assert.match(design,/--ugo-color-primary:var\(--ugo-color-brand-500\)/)
 assert.match(design,/--ugo-color-primary-container:var\(--ugo-color-accent\)/)
 assert.doesNotMatch(design,/--ugo-color-primary:#006948/)
})

test('role shells scope the accessible primary and keep the bright accent for live states',async()=>{
 const[client,provider]=await Promise.all([
  read('src/features/client/ui/clientUxRefresh.css'),
  read('src/mvp/provider/provider-ux-2026.css')
 ])
 for(const css of[client,provider])assert.match(css,/--ugo-color-primary:var\(--ugo-color-brand-500\)/)
 assert.match(client,/\.ugo-home-order-eta/)
 assert.match(provider,/--studio-primary:var\(--ugo-color-brand-500\)/)
})

test('legacy green identity layers now resolve through cyan tokens',async()=>{
 const[premium,studio,sidebar,dark]=await Promise.all([
  read('src/features/client/legacy/premium/clientPremium2026.css'),
  read('src/mvp/provider/provider-ai-studio-production-lock.css'),
  read('src/mvp/provider/provider-studio-sidebar.css'),
  read('src/mvp/ugo-dark-premium.css')
 ])
 assert.match(premium,/--cp-green:var\(--ugo-color-accent\)/)
 assert.match(premium,/--cp-green-deep:var\(--ugo-color-primary\)/)
 assert.match(studio,/--studio-primary:var\(--ugo-color-primary\)/)
 assert.match(sidebar,/var\(--provider-accent/)
 assert.doesNotMatch(sidebar,/background:#006b58/)
 assert.match(dark,/--ugo-color-primary:var\(--ugo-color-accent\)/)
 assert.doesNotMatch(dark,/background:#0d5039/)
})

test('client home reads the real persisted ETA and never blocks on failure',async()=>{
 const[hook,home,css]=await Promise.all([
  read('src/features/client/hooks/useClientOrderEta.ts'),
  read('src/features/client/home/ClientHomeScreen.tsx'),
  read('src/features/client/ui/clientUxRefresh.css')
 ])
 assert.match(hook,/obtener_tracking_servicio_cliente/)
 assert.match(hook,/getRoutingProvider\(\)\.route/)
 assert.match(hook,/setInterval/)
 assert.match(hook,/catch\{/)
 assert.doesNotMatch(hook,/reportSentinelIncident/)
 assert.match(home,/useClientOrderEta\(supabase,etaOrderId\)/)
 assert.match(home,/Llega en ~\$\{etaMinutes\} min/)
 assert.match(home,/order\.proveedor_id\?'Profesional asignado'/)
 assert.match(home,/timeAgo\(etaUpdatedAt\)/)
 assert.match(css,/\.ugo-client-root \.ugo-home-hero \.ugo-home-order-eta\.is-live/)
})

test('client home finishes the cascade with a light shell and one dark hero',async()=>{
 const[css,styles]=await Promise.all([
  read('src/features/client/ui/clientUxRefresh.css'),
  read('src/features/client/clientStyles.ts')
 ])
 assert.ok(styles.trim().endsWith("import'./ui/clientUxRefresh.css'"),'ux refresh must close the client cascade')
 assert.match(css,/\.ugo-client-root\.ugo-client-screen-home\{background:var\(--ugo-color-page\)!important\}/)
 assert.match(css,/\.ugo-client-root \.ugo-home-hero\{[\s\S]*--ugo-color-inverse-surface/)
 assert.match(css,/\.ugo-client-root \.ugo-home-hero \.ugo-home-hugo-cta\{[\s\S]*--ugo-color-on-accent/)
 assert.match(css,/@media\(max-width:699px\)[\s\S]*ugo-home-mobile-nav/)
 assert.match(css,/prefers-reduced-motion/)
})
