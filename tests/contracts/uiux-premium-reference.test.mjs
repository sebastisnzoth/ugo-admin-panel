import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const source=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client premium home preserves the current approved product hierarchy',async()=>{
 const[text,root]=await Promise.all([source('src/mvp/client/ClientPremiumHome.tsx'),source('src/mvp/client/ClientRoot.tsx')])
 assert.match(text,/const CORE_SERVICES:/)
 assert.match(text,/4 rubros principales/)
 assert.match(text,/Ver catálogo completo de especialidades/)
 assert.match(text,/ugo-studio-map/)
 assert.match(text,/flow\.publishHugoIntent/)
 assert.match(root,/flow\.screen!=='request'&&!detailOpen&&<ClientHugoBridge/)
 assert.doesNotMatch(text,/UGO_CLIENT_GUIDED_REQUEST_OPEN/)
 assert.match(text,/maplibre-gl\/dist\/maplibre-gl\.css/)
})

test('dark premium theme covers client provider and admin',async()=>{
 const text=await source('src/mvp/ugo-dark-premium.css')
 assert.match(text,/--ugo-color-surface:#07111c/)
 assert.match(text,/--ugo-color-primary:#20f29a/)
 assert.match(text,/\.ugo-provider-structural-metrics div/)
 assert.match(text,/\.ugo-admin-stitch\{--ahs-bg:#07111c/)
 assert.match(text,/\.ahs-kpis article/)
})

test('premium theme loads after usability hardening',async()=>{
 const text=await source('src/mvp/MvpApp.tsx')
 assert.ok(text.indexOf("'./ugo-dark-premium.css'")>text.indexOf("'./ugo-uiux-p0.css'"))
})
