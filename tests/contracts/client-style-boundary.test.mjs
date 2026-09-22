import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client root delegates legacy style composition to feature boundary',async()=>{const[root,styles]=await Promise.all([read('src/mvp/client/ClientRoot.tsx'),read('src/features/client/clientStyles.ts')]);assert.match(root,/features\/client\/clientStyles/);assert.doesNotMatch(root,/client-guided-request\.css/);for(const css of ['client-guided-request.css','client-ai-studio-production-lock.css','client-premium-2026.css','client-profile-premium-2026.css'])assert.ok(styles.includes(css))})
