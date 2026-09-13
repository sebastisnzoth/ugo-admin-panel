import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('MvpApp loads UI/UX P0 hardening after base UI styles', async () => {
  const app = await read('src/mvp/MvpApp.tsx')
  const base = app.indexOf("import'./ugo-uiux.css'")
  const p0 = app.indexOf("import'./ugo-uiux-p0.css'")
  assert.ok(base >= 0, 'base UI/UX stylesheet must remain loaded')
  assert.ok(p0 > base, 'P0 UI/UX overrides must load after base UI styles')
})

test('UI/UX P0 preserves touch, safe-area, focus and reduced-motion contracts', async () => {
  const css = await read('src/mvp/ugo-uiux-p0.css')
  assert.match(css, /min-height:48px/)
  assert.match(css, /:focus-visible/)
  assert.match(css, /env\(safe-area-inset-bottom\)/)
  assert.match(css, /100dvh/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.match(css, /\.ugo-guided-primary\{[\s\S]*position:sticky/)
  assert.match(css, /\.ugo-provider-structural-cta\{[\s\S]*min-height:58px/)
})
