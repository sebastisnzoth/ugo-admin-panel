import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const ui=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')

test('kill switch prompt cannot be confused with activating an agent',()=>{
 assert.match(ui,/BLOQUEAR con kill switch/)
 assert.match(ui,/RECUPERAR \/ quitar kill switch/)
 assert.doesNotMatch(ui,/Motivo auditable para \$\{enabled\?'activar':'recuperar'/)
})
