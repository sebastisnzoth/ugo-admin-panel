import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider root delegates legacy style composition to provider feature boundary',async()=>{const[root,styles]=await Promise.all([read('src/mvp/provider/ProviderRoot.tsx'),read('src/features/provider/providerStyles.ts')]);assert.match(root,/features\/provider\/providerStyles/);for(const name of ['provider-flow.css','provider-responsive-layout.css','provider-simple-flow.css','provider-ux-v2.css','provider-redesign-2026.css','provider-ai-studio-production-lock.css','provider-premium-2026.css','provider-design-tokens.css']){assert.doesNotMatch(root,new RegExp(name.replace('.','\\.')));assert.match(styles,new RegExp(name.replace('.','\\.')))}assert.match(styles,/provider-studio-sidebar\.css/);assert.match(styles,/provider-rating\.css/)})
