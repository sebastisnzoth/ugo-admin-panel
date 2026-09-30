import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider keeps online work and demand status visible across screens',async()=>{
 const root=await read('src/mvp/provider/ProviderRoot.tsx')
 assert.match(root,/provider-operational-dock/)
 assert.match(root,/data\.online\?'Online':'Offline'/)
 assert.match(root,/jobLabel/)
 assert.match(root,/data\.opportunities\.length/)
 assert.match(root,/provider-nav-work-dot/)
 assert.match(root,/provider-nav-attention/)
 assert.match(root,/aria-label=\{data\.service\?/)
})

test('provider operational dock stays compact on mobile and leaves mission controls unobstructed',async()=>{
 const css=await read('src/mvp/provider/provider-simple-flow.css')
 assert.match(css,/\.provider-operational-dock\{/)
 assert.match(css,/bottom:calc\(74px \+ env\(safe-area-inset-bottom\)\)/)
 assert.match(css,/\.ugo-provider-root\.is-mission-active \.provider-operational-dock\{display:none\}/)
 assert.match(css,/@media\(max-width:560px\)/)
})
