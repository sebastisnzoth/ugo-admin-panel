import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider production cleanup is the final visual authority',async()=>{
 const styles=await read('src/features/provider/providerStyles.ts')
 const cleanup="provider-production-cleanup.css"
 assert.match(styles,new RegExp(cleanup.replace('.','\\.')))
 assert.equal(styles.trim().split('\n').at(-1),"import'../../mvp/provider/provider-production-cleanup.css'")
})

test('provider production cleanup keeps one persistent navigation per breakpoint',async()=>{
 const css=await read('src/mvp/provider/provider-production-cleanup.css')
 assert.match(css,/\.provider-operational-dock\{\s*display:none!important/)
 assert.match(css,/@media\(max-width:999px\)[\s\S]*\.provider-bottom-nav\{[\s\S]*display:grid!important/)
 assert.match(css,/@media\(min-width:1000px\)[\s\S]*\.provider-studio-sidebar\{[\s\S]*display:grid!important/)
 assert.match(css,/@media\(min-width:1000px\)[\s\S]*\.provider-bottom-nav\{display:none!important\}/)
})

test('provider production cleanup is usable on small phones and desktop',async()=>{
 const css=await read('src/mvp/provider/provider-production-cleanup.css')
 assert.match(css,/@media\(max-width:560px\)/)
 assert.match(css,/provider-quick-grid,[\s\S]*provider-profile-dashboard,[\s\S]*provider-profile-identity[\s\S]*grid-template-columns:1fr!important/)
 assert.match(css,/@media\(min-width:1000px\)[\s\S]*padding-left:228px!important/)
 assert.match(css,/\.provider-screen\{[\s\S]*width:min\(100%,960px\)!important/)
})
