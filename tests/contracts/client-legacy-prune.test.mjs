import test from'node:test'
import assert from'node:assert/strict'
import{existsSync}from'node:fs'

test('retired alternate Client runtime stays out of the canonical architecture',()=>{
 assert.equal(existsSync('src/mvp/ClientQuantumExperience.tsx'),false)
 assert.equal(existsSync('src/mvp/client-quantum.css'),false)
})
