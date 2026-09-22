import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client root delegates legacy style composition to feature boundary',async()=>{const[root,styles]=await Promise.all([read('src/mvp/client/ClientRoot.tsx'),read('src/features/client/clientStyles.ts')]);assert.match(root,/features\/client\/clientStyles/);assert.doesNotMatch(root,/client-guided-request\.css/);for(const css of ['client-guided-request.css','client-ai-studio-production-lock.css','client-premium-2026.css','client-profile-premium-2026.css'])assert.ok(styles.includes(css))})
test('client real-test fixes reuse global tokens for shared spacing and surface values',async()=>{const css=await read('src/mvp/client/client-real-test-fixes.css');for(const token of ['--ugo-space-6','--ugo-space-3','--ugo-space-2','--ugo-color-surface','--ugo-color-text-muted'])assert.ok(css.includes(`var(${token})`));assert.doesNotMatch(css,/background:#fff/);assert.doesNotMatch(css,/color:#667085/)})
