import test from'node:test'
import assert from'node:assert/strict'
import{readFileSync}from'node:fs'
const read=(path)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')

test('provider collection has real full-size responsive method controls and a visible cash finalization action',()=>{
 const screen=read('src/mvp/ProviderPostServiceCollection.tsx')
 const css=read('src/mvp/provider/provider-redesign-2026.css')
 assert.match(screen,/className="ugo-collection-methods"/)
 assert.match(screen,/className="ugo-collection-action" disabled=\{busy\|\|requestSent\}/)
 assert.match(screen,/requestCashConfirmation/)
 assert.match(css,/\.ugo-collection-methods\{display:grid/)
 assert.match(css,/\.ugo-collection-method\{all:unset/)
 assert.match(css,/min-height:86px/)
 assert.match(css,/focus-visible/)
 assert.match(css,/@media\(max-width:540px\)/)
})

test('Pix entry opens a modal and retrieves only an existing valid pending QR for the owned service',()=>{
 const screen=read('src/mvp/ProviderPostServiceCollection.tsx')
 assert.match(screen,/onClick=\{\(\)=>setPixDetailsOpen\(true\)\}/)
 assert.match(screen,/\.eq\('proveedor_id',auth\.user\.id\)/)
 assert.match(screen,/\.eq\('servicio_id',serviceId\)\.in\('metodo',\['pix','pix_direto','openpix'\]\)/)
 assert.match(screen,/row\.estado==='pendiente'/)
 assert.match(screen,/row\.procesador==='asaas'/)
 assert.match(screen,/pix_expira_at/)
 assert.match(screen,/notExpired/)
 assert.match(screen,/Math\.abs\(Number\(row\.monto_bruto\)-amount\)<0\.009/)
 assert.match(screen,/pix_copia_cola/)
 assert.match(screen,/pix_qr_code/)
 assert.match(screen,/navigator\.clipboard\.writeText\(pixCode\)/)
 assert.doesNotMatch(screen,/\.from\('pagos'\)\.insert\(|\.from\('pagos'\)\.update\(/)
 assert.doesNotMatch(screen,/https:\/\/api-sandbox\.asaas\.com/)
})
