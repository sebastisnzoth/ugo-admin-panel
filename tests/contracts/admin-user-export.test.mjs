import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('admin users can export a CSV without exposing authentication secrets',async()=>{const s=await read('src/mvp/AdminUsersPanel.tsx');assert.match(s,/Exportar CSV/);assert.match(s,/ugo-usuarios-/);assert.match(s,/NO_EXPORTABLE/);assert.match(s,/hashes no reversibles/);assert.doesNotMatch(s,/password_hash/)})
