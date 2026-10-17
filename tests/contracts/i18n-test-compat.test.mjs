import './i18n-test-compat.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'

test('source contracts resolve visible copy only through referenced locale keys', () => {
  assert.match("<LocalizedText id=\"history.all\" />", /Todos/)
  assert.throws(() => assert.match("<LocalizedText id=\"history.all\" />", /Guardar/))
  assert.throws(() => assert.match("<LocalizedText id=\"history.all\" />", /unrelated untranslated text/))
})
