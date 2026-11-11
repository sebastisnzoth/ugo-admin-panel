import test from'node:test'
import assert from'node:assert/strict'
import{readFileSync}from'node:fs'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')

test('UGO Provider Pix modal has real action to open isolated Sandbox QR demo',()=>{
 const screen=read('src/mvp/ProviderPostServiceCollection.tsx')
 const styles=read('src/mvp/provider/provider-redesign-2026.css')
 assert.match(screen,/PIX_SANDBOX_DEMO_URL='https:\/\/ugo-pagamentos-v2-sandbox-[a-z0-9-]+\.vercel\.app\/demo\.html'/)
 assert.match(screen,/onClick=\{\(\)=>setSandboxEmbedOpen\(true\)\}/)
 assert.match(screen,/className="ugo-collection-sandbox-frame"/)
 assert.match(screen,/src=\{PIX_SANDBOX_DEMO_URL\+'\?embed=1'\}/)
 assert.match(screen,/sandbox="allow-scripts allow-same-origin allow-forms"/)
 assert.match(screen,/referrerPolicy="no-referrer"/)
 assert.doesNotMatch(screen,/target="_blank"/)
 assert.match(screen,/sandboxAction:'Testar QR Pix Sandbox'/)
 assert.match(screen,/sandboxNote:'Abre um teste separado de R\$ 100,00/)
 assert.match(styles,/\.ugo-collection-sandbox-demo/)
 assert.match(styles,/min-height:50px/)
 assert.match(styles,/ugo-collection-modal-embedded/)
})

test('Pix Sandbox button does not submit live service or reuse real charge',()=>{
 const screen=read('src/mvp/ProviderPostServiceCollection.tsx')
 const fragment=screen.slice(screen.indexOf('ugo-collection-sandbox-demo'))
 assert.doesNotMatch(fragment,/serviceId\s*[)}&]|p_servicio_id|\/api\/pagos\/crear/)
 assert.match(screen,/row\.procesador==='asaas'/)
 assert.match(screen,/row\.estado==='pendiente'/)
})
