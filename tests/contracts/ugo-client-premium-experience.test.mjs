import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const source=readFileSync(new URL('../../src/features/client/home/ClientHomeScreen.tsx',import.meta.url),'utf8')
const css=readFileSync(new URL('../../src/features/client/ui/clientPremiumExperience2026.css',import.meta.url),'utf8')
const styles=readFileSync(new URL('../../src/features/client/clientStyles.ts',import.meta.url),'utf8')

test('Premium search uses real categories without replacing client request flow',()=>{
 for(const token of ['serviceSearch','matchingCategories','localizedCategory','choose(category)','flow.navigate(\'request\')','flow.publishHugoIntent']){
  assert.ok(source.includes(token),'missing '+token)
 }
 assert.match(source,/type="search"/)
})
test('Map expansion keeps live provider radar and assigned-order map',()=>{
 for(const token of ['mapExpanded','ugo-client-map','ClientActiveMap','providerRadarStore','AssignedProviderCard','onlineProviders']){
  assert.ok(source.includes(token),'missing '+token)
 }
})
test('Premium experience styles stay scoped to client and allow mobile page scroll',()=>{
 assert.ok(styles.includes("import'./ui/clientPremiumExperience2026.css'"))
 assert.match(css,/\.ugo-client-root \.ugo-home-screen/)
 assert.match(css,/overflow:visible!important/)
 assert.match(css,/safe-area-inset-bottom/)
 assert.match(css,/max-width:359px/)
})
