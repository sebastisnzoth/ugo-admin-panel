import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('admin password reset is server-side, audited and role protected',async()=>{const[api,panel]=await Promise.all([read('api/operations.ts'),read('src/mvp/AdminUsersPanel.tsx')]);assert.match(api,/admin-reset-password/);assert.match(api,/auth\.admin\.updateUserById\(userId, \{ password \}\)/);assert.match(api,/admin_usuario_password_reset/);assert.match(api,/PRIVILEGED_USER_ROLES\.has\(String\(target\.tipo\)\) && actorRole !== 'superadmin'/);assert.match(panel,/🔑 Contraseña/);assert.match(panel,/La contraseña anterior dejará de funcionar/);assert.match(panel,/No se guarda ni se exporta la contraseña/)})
