import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL('../../' + path, import.meta.url), 'utf8')

test('cross-visual keeps one canonical token contract and coherent primitives', async () => {
  const css = await read('src/mvp/ugo-design-system.css')
  for (const token of [
    '--ugo-font:',
    '--ugo-color-primary:',
    '--ugo-color-surface:',
    '--ugo-color-on-surface:',
    '--ugo-color-outline-variant:',
    '--ugo-touch-target:48px',
    '--ugo-radius-md:',
    '--ugo-radius-lg:',
    '--ugo-shadow-card:',
    '--ugo-duration-fast:'
  ]) assert.ok(css.includes(token), token)

  for (const primitive of [
    '.ugo-ds-button',
    '.ugo-ds-field',
    '.ugo-ds-card',
    '.ugo-ds-status',
    '.ugo-ds-bottom-nav',
    '.ugo-ds-topbar',
    '.ugo-ds-modal',
    '.ugo-ds-drawer'
  ]) assert.ok(css.includes(primitive), primitive)

  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.match(css, /focus-visible/)
})

test('cross-visual client composition is centralized inside features/client', async () => {
  const styles = await read('src/features/client/clientStyles.ts')
  const imports = [...styles.matchAll(/import'([^']+\.css)'/g)].map((match) => match[1])
  assert.ok(imports.length >= 10)
  assert.ok(imports.every((specifier) => specifier.startsWith('./')))
  assert.equal(styles.includes('../../mvp/client'), false)
  assert.equal(new Set(imports).size, imports.length)
})

test('cross-visual provider and autonomous control room preserve responsive hierarchy', async () => {
  const [provider, autonomous] = await Promise.all([
    read('src/mvp/provider/provider-simple-flow.css'),
    read('src/mvp/autonomous-corporation.css')
  ])
  for (const css of [provider, autonomous]) {
    assert.match(css, /@media\(max-width:/)
  }
  assert.match(provider, /provider-main-action/)
  assert.match(provider, /provider-bottom-nav/)
  assert.match(provider, /provider-operational-dock/)
  assert.match(autonomous, /ugo-live-grid/)
  assert.match(autonomous, /ugo-live-toolbar/)
  assert.match(autonomous, /ugo-live-stats/)
})
