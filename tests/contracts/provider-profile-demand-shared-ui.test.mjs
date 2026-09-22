import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider profile and categories consume shared form primitives',async()=>{
 const[p,c]=await Promise.all([read('src/mvp/provider/ProviderProfile.tsx'),read('src/mvp/provider/ProviderCategoriesEditor.tsx')])
 assert.match(p,/from'\.\.\/\.\.\/shared\/ui'/)
 for(const token of ['SectionHeader','StatusPill','Textarea','Input','Button'])assert.match(p,new RegExp(token))
 assert.match(p,/d\.saveProfile/)
 assert.match(p,/d\.toggleOnline/)
 assert.match(p,/d\.signOut/)
 assert.match(c,/Select/)
 assert.match(c,/LoadingState/)
 assert.match(c,/guardar_categorias_proveedor/)
})

test('provider demand consumes shared UI and keeps live data actions',async()=>{
 const s=await read('src/mvp/provider/ProviderDemand.tsx')
 for(const token of ['SectionHeader','StatusPill','EmptyState','Card','Button'])assert.match(s,new RegExp(token))
 assert.match(s,/ProviderDemandMap signals=\{d\.demand\}/)
 assert.match(s,/d\.reload\(\)/)
 assert.match(s,/flow\.actions\.openOpportunities/)
})
