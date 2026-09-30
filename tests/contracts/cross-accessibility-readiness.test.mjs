import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
const[globals,tokens,shared,main,runtime]=await Promise.all([
 read('src/styles/globals.css'),
 read('src/styles/tokens.css'),
 read('src/shared/ui/index.tsx'),
 read('src/main.tsx'),
 read('src/lib/accessibilityRuntime.ts'),
])

function hexLum(hex){
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4)
 return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]
}
function contrast(a,b){
 const[x,y]=[hexLum(a),hexLum(b)].sort((m,n)=>n-m)
 return(x+.05)/(y+.05)
}

test('global keyboard focus remains visible and touch targets meet basic minimums',()=>{
 assert.match(globals,/:focus-visible\{[^}]*outline:/s)
 assert.match(globals,/button[^\{]*\{[^}]*min-height:44px/s)
 assert.match(globals,/input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)[^\{]*\{[^}]*min-height:44px/s)
})

test('primary text contrast meets WCAG AA for normal text',()=>{
 const match=tokens.match(/--ugo-color-brand-500:(#[0-9a-fA-F]{6})/)
 assert.ok(match,'brand-500 token must exist')
 assert.ok(contrast(match[1],'#ffffff')>=4.5,`brand primary contrast is ${contrast(match[1],'#ffffff').toFixed(2)}:1`)
})

test('shared primitives carry semantic labels and dialog keyboard runtime is installed',()=>{
 assert.match(shared,/aria-busy=/)
 assert.match(shared,/aria-label=\{label\}/)
 assert.match(shared,/role="dialog"/)
 assert.match(shared,/aria-modal="true"/)
 assert.match(main,/installAccessibilityRuntime\(\)/)
 assert.match(runtime,/event\.key==='Tab'/)
 assert.match(runtime,/event\.key==='Escape'/)
 assert.match(runtime,/focus\(\{preventScroll:true\}\)/)
})
