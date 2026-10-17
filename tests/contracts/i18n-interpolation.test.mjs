import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// Guard the template interpolation regex against accidentally matching literal backslashes.
const source = readFileSync(new URL('../../src/i18n/locale.tsx', import.meta.url), 'utf8')
const pattern = source.match(/return template\.replace\((\/.*?\/g),\s*\(match,name:string\)/)?.[1]

test('locale interpolation matches named placeholders without backslashes', () => {
  assert.ok(pattern, 'locale translation interpolation regex was not found')
  const regex = Function('return ' + pattern)()
  assert.deepEqual('Olá, {name}. Avaliação {rating}'.match(regex), ['{name}', '{rating}'])
  assert.equal('Olá, {name}.'.replace(regex, (_, key) => ({ name: 'Ana' })[key]), 'Olá, Ana.')
})
