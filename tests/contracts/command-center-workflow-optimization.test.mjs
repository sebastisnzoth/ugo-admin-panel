import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const html = fs.readFileSync(new URL('../../pages/index.html', import.meta.url), 'utf8')

test('Command Center exposes continuation actions for readiness lifecycle states', () => {
  for (const state of ['FIXED_IN_PR','WAITING_RUNTIME','JUDGE_PENDING','SENTINEL_PENDING']) {
    assert.match(html, new RegExp(state))
  }
  assert.match(html, /Validar PR y continuar/)
  assert.match(html, /Completar prueba runtime/)
  assert.match(html, /Ejecutar Judge/)
  assert.match(html, /Ejecutar Sentinel/)
})

test('Command Center builds a bounded safe batch for UGO Maestro', () => {
  assert.match(html, /id="runSafeBatch"/)
  assert.match(html, /id="copySafeBatch"/)
  assert.match(html, /getSafeBatch/)
  assert.match(html, /slice\(0, Math\.min\(5,/)
  assert.match(html, /UGO — EJECUTAR LOTE SEGURO DESDE IMPLEMENTATION COMMAND CENTER/)
  assert.match(html, /No declarar VERIFIED sin lock DONE \+ evidencia \+ Judge PASS \+ Sentinel PASS/)
})
