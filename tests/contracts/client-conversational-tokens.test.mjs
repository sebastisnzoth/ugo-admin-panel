import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client conversational stage consumes global inverse design tokens',async()=>{const[tokens,css]=await Promise.all([read('src/styles/tokens.css'),read('src/features/client/conversation/clientConversationalStage.css')]);for(const token of ['--ugo-color-inverse-surface','--ugo-color-inverse-border','--ugo-color-inverse-text','--ugo-color-inverse-text-muted','--ugo-color-accent-bright','--ugo-color-on-accent-bright']){assert.ok(tokens.includes(token),token);assert.ok(css.includes('var('+token+')'),token)}assert.match(css,/gap:var\(--ugo-space-2\)/);assert.match(css,/padding-bottom:var\(--ugo-space-3\)/);assert.doesNotMatch(css,/#2b465b|#0b1d2b|#f5fbff|#7890a2|#20f29a|#04150f/)})
