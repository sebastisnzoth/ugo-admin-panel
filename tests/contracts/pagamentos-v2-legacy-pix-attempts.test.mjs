import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../../api/pagos/crear.ts',import.meta.url),'utf8')
test('legacy payment creation never chooses an arbitrary historical attempt',()=>{
 assert.match(source,/\.order\('created_at', \{ ascending: false \}\)/)
 assert.match(source,/\.order\('id', \{ ascending: false \}\)\.limit\(2\)/)
 assert.match(source,/MULTIPLE_PAYMENT_ATTEMPTS_REQUIRE_RECONCILIATION/)
 const lookup=source.indexOf("const { data: priorPayments")
 const reject=source.indexOf("MULTIPLE_PAYMENT_ATTEMPTS_REQUIRE_RECONCILIATION")
 const confirmed=source.indexOf("const confirmed =")
 assert.ok(lookup>=0&&reject>lookup&&confirmed>reject)
 assert.doesNotMatch(source,/eq\('servicio_id', servicioId\)\.limit\(1\)\.maybeSingle\(\)/)
})
