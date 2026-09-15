import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('api/operations.ts','utf8')

test('privileged KYC verification requires an authenticated active Admin',()=>{
 assert.match(source,/async function requireAdmin\(req: VercelRequest\)/)
 assert.match(source,/const token = accessToken\(req\)/)
 assert.match(source,/sb\.auth\.getUser\(token\)/)
 assert.match(source,/\.select\('tipo,activo'\)/)
 assert.match(source,/!profile\?\.activo \|\| !\['admin', 'superadmin'\]\.includes\(String\(profile\.tipo\)\)/)
 assert.match(source,/const \{ sb, user \} = await requireAdmin\(req\)/)
})

test('KYC reviewer identity comes from the authenticated Admin, never from request body',()=>{
 assert.doesNotMatch(source,/adminId/)
 assert.match(source,/revisor_id: user\.id/)
})

test('KYC approval validates its payload before privileged mutation',()=>{
 assert.match(source,/typeof aprobado !== 'boolean'/)
 assert.match(source,/documentoId\.trim\(\)/)
 assert.match(source,/notas\.trim\(\)\.slice\(0, 2000\)/)
})
