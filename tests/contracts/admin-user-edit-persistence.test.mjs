import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

test('admin edit checks the affected row and reads persisted state before confirming success', async()=>{
 const source=await readFile(new URL('../../src/mvp/AdminUsersPanel.tsx',import.meta.url),'utf8')
 assert.match(source,/\.update\(updates\)\.eq\('id',editing\.id\)\.select\('id,nombre,apellido,pais,zona'\)\.maybeSingle\(\)/)
 assert.match(source,/if\(!data\|\|data\.id!==editing\.id\)throw new Error/)
 assert.match(source,/const \{data:verified,error:verifyError\}=await/)
 assert.match(source,/Object\.keys\(updates\)\.some/)
 assert.match(source,/await load\(\);setEditing\(null\)/)
})
