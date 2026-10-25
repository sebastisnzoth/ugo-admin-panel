import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL('../../' + path, import.meta.url), 'utf8')

test('Super Admin home map keeps its native minimum height and stacks on phones', async () => {
  const [css, map, native] = await Promise.all([
    read('src/mvp/admin-home-stitch.css'),
    read('src/components/MapaOperativo.tsx'),
    read('src/mvp/AdminNativeModules.tsx')
  ])
  assert.match(native, /minHeight:560/)
  assert.match(css, /\.ahs-map\{height:clamp\(560px,58dvh,680px\);min-height:560px\}/)
  assert.match(css, /\.ahs-map \.ugo-admin-map-body\{flex-direction:column\}/)
  assert.match(css, /\.ahs-map \.ugo-admin-map-stage\{flex:1 1 auto;min-height:260px;min-width:0\}/)
  assert.match(map, /className="ugo-admin-map-body"/)
  assert.match(map, /className="ugo-admin-map-filters"/)
  assert.match(map, /className="ugo-admin-map-stage"/)
})

test('Super Admin service rows are readable at narrow widths', async () => {
  const css = await read('src/mvp/admin-home-stitch.css')
  assert.match(css, /@media\(max-width:1680px\)\{\s*\.ahs-main-grid\{grid-template-columns:minmax\(0,1fr\)\}/)
  assert.match(css, /grid-template-areas:"number price" "state state" "category category"/)
  assert.match(css, /\.ahs-service-row>b\{white-space:nowrap/)
})

test('Gmail status retries an expired Admin bearer once after role bootstrap', async () => {
  const src = await read('src/mvp/AdminPhase2.tsx')
  assert.match(src, /if\(r.status===401\)r=await request\(await adminToken\(true\)\)/)
  assert.match(src, /useEffect\(\(\)=>\{if\(adminRole\)void loadGmail\(\)\},\[adminRole,loadGmail\]\)/)
})
