import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const history=readFileSync('src/mvp/ServiceHistoryPanel.tsx','utf8')
test('client activity clearly handles errors, empty filters and unconfirmed amounts',()=>{
 assert.match(history,/clientActivity\.loadError/)
 assert.match(history,/clientActivity\.filteredEmpty/)
 assert.match(history,/onClick=\{\(\)=>setFilter\('todos'\)\}/)
 assert.match(history,/r\.tarifa==null/)
 assert.match(history,/clientActivity\.amountPending/)
 assert.match(history,/onClick=\{\(\)=>onOpenService\(r\.id\)\}/)
})
