import test from'node:test'
import assert from'node:assert/strict'
import{readFileSync}from'node:fs'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')

test('UGO Provider Pix modal has real action to open isolated Sandbox QR demo',()=>{
 const screen=read('src/mvp/ProviderPostServiceCollection.tsx')
 const styles=read('src/mvp/provider/provider-redesign-2026.css')
 assert.match(screen,/PIX_SANDBOX_DEMO_URL='https:\/\/ugo-pagamentos-v2-sandbox-[a-z0-9-]+\.vercel\.app\/demo\.html'/)
 assert.match(screen,/href=\{PIX_SANDBOX_DEMO_URL\}/)
 assert.match(screen,/target="_blank" rel="noopener noreferrer"/)
 assert.match(screen,/referrerPolicy="no-referrer"/)
 assert.match(screen,/sandboxAction:'Testar QR Pix Sandbox'/)
 assert.match(screen,/sandboxNote:'Abre um teste separado de R\$ 100,00/)
 assert.match(styles,/\.ugo-collection-sandbox-demo/)
 assert.match(styles,/min-height:50px/)
})

test('Pix Sandbox button does not submit live service or reuse real charge',()=>{
 const screen=read('src/mvp/ProviderPostServiceCollection.tsx')
 const fragment=screen.slice(screen.indexOf('ugo-collection-sandbox-demo'))
 assert.doesNotMatch(fragment,/serviceId\s*[)}&]|p_servicio_id|\/api\/pagos\/crear/)
 assert.match(screen,/row\.procesador==='asaas'/)
 assert.match(screen,/row\.estado==='pendiente'/)
})
