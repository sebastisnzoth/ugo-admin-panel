import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
const oauthScript = scripts.map(match => match[1]).find(script => script.includes('ugo_oauth_dest'))
assert.ok(oauthScript, 'OAuth redirect script exists')

function simulate(destination, search = '?code=oauth-test') {
  const entries = new Map([['ugo_oauth_dest', destination]])
  const redirects = []
  const location = { search, hash: '', replace: url => redirects.push(url) }
  runInNewContext(oauthScript, {
    localStorage: {
      getItem: key => entries.get(key) ?? null,
      removeItem: key => entries.delete(key),
    },
    location,
    window: { stop() {}, addEventListener() {} },
    navigator: {},
    console,
  })
  return { redirects, entries }
}

test('OAuth callback retains a legitimate client destination and callback code', () => {
  assert.deepEqual(simulate('/client.html').redirects, ['/client.html?code=oauth-test'])
})

test('OAuth callback retains a legitimate provider destination and callback code', () => {
  assert.deepEqual(simulate('/provider.html').redirects, ['/provider.html?code=oauth-test'])
})

test('OAuth callback rejects cross-origin and protocol-relative destinations', () => {
  for (const destination of ['https://attacker.example/', '//attacker.example', 'javascript:alert(1)', '/\\attacker.example', '/client.html?next=https://attacker.example']) {
    const result = simulate(destination)
    assert.deepEqual(result.redirects, [], destination)
    assert.equal(result.entries.has('ugo_oauth_dest'), false, destination)
  }
})

test('Non-OAuth navigation is not redirected', () => {
  assert.deepEqual(simulate('/client.html', '?app=client').redirects, [])
})
