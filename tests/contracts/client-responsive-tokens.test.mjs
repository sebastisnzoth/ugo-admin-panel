import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client responsive shell consumes global layout tokens',async()=>{const[tokens,css]=await Promise.all([read('src/styles/tokens.css'),read('src/features/client/ui/clientResponsiveLayout.css')]);for(const token of ['--ugo-color-inverse-page','--ugo-color-inverse-divider','--ugo-color-inverse-rail','--ugo-color-accent-bright-soft','--ugo-color-overlay-strong','--ugo-shadow-overlay-strong']){assert.ok(tokens.includes(token),token);assert.ok(css.includes('var('+token+')'),token)}assert.match(css,/gap:var\(--ugo-space-3\)/);assert.match(css,/border-radius:var\(--ugo-radius-xl\)/);assert.match(css,/border-radius:var\(--ugo-radius-lg\)/);assert.doesNotMatch(css,/#07111c|#20364a|#050d15|rgba\(32,242,154,\.08\)|rgba\(3,10,16,\.92\)|0 28px 80px rgba\(0,0,0,\.36\)/)})

test('mobile nav resets legacy centering transform after left/right hardening',async()=>{
 const css=await read('src/features/client/ui/clientResponsiveHardening.css')
 assert.match(css,/\.ugo-client-root \.ugo-home-mobile-nav\{[\s\S]*left:8px!important;[\s\S]*right:8px!important;[\s\S]*width:auto!important;[\s\S]*transform:none!important;/)
})
