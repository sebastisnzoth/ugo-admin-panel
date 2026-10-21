import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const trace=readFileSync('src/lib/roleSupabase.ts','utf8')
const auth=readFileSync('src/mvp/shared.tsx','utf8')
test('provider auth history is bounded and does not include secrets',()=>{
 assert.match(trace,/list\.slice\(-40\)/)
 assert.match(trace,/list\.push\(\{at, origin, reason, event: event \|\| null\}\)/)
 assert.doesNotMatch(trace,/list\.push\(\{.*(?:token|session|userId|email)/)
 assert.match(auth,/getProviderAuthTrace\(\)/)
 assert.match(auth,/Copiar diagnóstico de sesión/)
})
