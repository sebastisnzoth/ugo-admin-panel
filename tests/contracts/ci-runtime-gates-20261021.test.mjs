import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read = path => readFile(new URL('../../' + path, import.meta.url), 'utf8')
const luminance = hex => {
 const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
 const linear = value => value <= 0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4
 return rgb.reduce((sum,value,i) => sum + linear(value)*[.2126,.7152,.0722][i],0)
}
const whiteContrast = hex => 1.05/(luminance(hex)+.05)

test('autonomous GPS QA receives immutable checkout revision from workflow trigger', async () => {
 const workflow = await read('.github/workflows/autonomous-worker-test.yml')
 assert.match(workflow, /- name: Execute GPS\/geofence QA probe\s+env:\s+UGO_RUNTIME_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}/)
 assert.match(await read('scripts/autonomous-qa-gps-runtime.mjs'), /UGO_RUNTIME_SHA_REQUIRED/)
})

test('provider runtime locates actual mobile navigation buttons independently of translated names', async () => {
 const [script,root] = await Promise.all([read('scripts/provider-ui-runtime.mjs'),read('src/mvp/provider/ProviderRoot.tsx')])
 for (const id of ['provider-mobile-home','provider-mobile-orders','provider-mobile-work','provider-mobile-profile']) {
  assert.ok(script.includes(id), id + ' missing in runtime')
  assert.ok(root.includes('data-testid="' + id + '"'), id + ' missing in UI')
 }
 assert.doesNotMatch(script, /\['Inicio','Pedidos','Trabajo','Perfil'\]/)
})

test('Admin login kicker contrast is white on black and standard submit has WCAG AA contrast', async () => {
 const [login,auth] = await Promise.all([read('src/mvp/ugo-login-v3.css'),read('src/mvp/ugo-auth-redesign.css')])
 const accent=login.match(/\.mvp-auth-page\.ugo-admin-auth\{\s*--ugo-login-accent:(#[0-9a-fA-F]{6})/)?.[1]
 assert.ok(accent,'Admin login accent missing')
 assert.ok(whiteContrast(accent)>=4.5,'Admin login action contrast must be at least 4.5:1')
 assert.match(auth,/\.mvp-auth-page:not\(\.role-client\):not\(\.role-provider\) \.mvp-auth-card \.ugo-admin-login-kicker\{color:#fff!important;background:#000!important\}/)
})
