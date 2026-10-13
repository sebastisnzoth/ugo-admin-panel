import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Contrato de COMPORTAMIENTO (no de texto) para server/hugo/security.ts.
// Regresión cubierta: 2026-10-13 — las regex de redacción estaban sobre-escapadas
// (\\b, \\s en vez de \b, \s) y NO redactaban JWT/secretos que viajaban al LLM.
// Los contratos de texto (hugo-security-boundaries, hugo-master-security-regression)
// no pudieron detectarlo porque solo verifican que existan los literales de reemplazo.

const src = fs.readFileSync('server/hugo/security.ts', 'utf8')

function loadSanitizeForModel() {
  const match = src.match(/export function sanitizeForModel[\s\S]*?\n\}/)
  assert.ok(match, 'sanitizeForModel debe existir en server/hugo/security.ts')
  const js = match[0]
    .replace('export function sanitizeForModel(value:unknown,max=4000)', 'function sanitizeForModel(value,max=4000)')
    .replace('let text=clean(value,max)', "let text=String(value??'').trim().slice(0,max)")
  const clean = (value, max = 4000) => String(value ?? '').trim().slice(0, max)
  return new Function('clean', `${js}; return sanitizeForModel;`)(clean)
}

const sanitizeForModel = loadSanitizeForModel()

test('sanitiza Bearer tokens reales sin filtrar el token', () => {
  const out = sanitizeForModel('Authorization: Bearer sk-abc123def456ghi789')
  assert.ok(!out.includes('sk-abc123def456ghi789'), `token filtrado: ${out}`)
  assert.ok(out.includes('[REDACTED]') || out.includes('[REDACTED_SECRET]'), out)
})

test('sanitiza JWTs reales (3 segmentos) sin filtrar el JWT', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcdefghij1234567890'
  const out = sanitizeForModel(`contexto con ${jwt} adentro`)
  assert.ok(!out.includes(jwt), `JWT filtrado: ${out}`)
  assert.ok(out.includes('[REDACTED_JWT]'), out)
})

test('sanitiza secretos estilo API key (sk-, ghp_, sb_secret_, AIza)', () => {
  for (const secret of ['sk-abc123def456ghi789', 'ghp_abcdefghijklmnop123456', 'sb_secret_abcdefghijklmnop', 'AIzaSyAbCdEfGhIjKlMnOpQrStUv']) {
    const out = sanitizeForModel(`clave ${secret} en contexto`)
    assert.ok(!out.includes(secret), `secreto filtrado (${secret}): ${out}`)
    assert.ok(out.includes('[REDACTED_SECRET]'), out)
  }
})

test('sanitiza pares clave=valor sensibles (password, token, secret)', () => {
  const out = sanitizeForModel('password: hunter2secretvalue')
  assert.ok(!out.includes('hunter2secretvalue'), out)
  assert.ok(out.includes('password=[REDACTED]'), out)
})

test('sanitiza blobs base64 largos', () => {
  const out = sanitizeForModel(`data:image/png;base64,${'A'.repeat(120)}`)
  assert.ok(!out.includes('A'.repeat(120)), out)
  assert.ok(out.includes('[REDACTED_BLOB]'), out)
})

test('conserva texto normal del usuario intacto', () => {
  const text = 'Necesito un plomero mañana a las 14:30 en casa'
  assert.equal(sanitizeForModel(text), text)
})

test('las regex de redacción del fuente no están sobre-escapadas (\\b debe ser \\b de 1 barra)', () => {
  const lines = src.split('\n').filter((line) => line.includes('.replace(') && line.includes('REDACTED'))
  assert.ok(lines.length >= 5, 'se esperan al menos 5 reglas de redacción')
  for (const line of lines) {
    // Un literal de regex con más de 1 backslash consecutivo antes de una clase \b \s \d \w \. está roto.
    assert.doesNotMatch(line, /\/[^/\n]*\\\\[bBsSwWdD.]/, `regex sobre-escapada en: ${line}`)
  }
})
