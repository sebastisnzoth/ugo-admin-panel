import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('admin imports the same CSV format without recovering exported passwords',async()=>{const[api,panel]=await Promise.all([read('api/operations.ts'),read('src/mvp/AdminUsersPanel.tsx')]);assert.match(panel,/Importar CSV/);assert.match(panel,/admin-import-users/);assert.match(api,/importAdminManagedUsers/);assert.match(api,/NO_EXPORTABLE/);assert.match(api,/creado_requiere_reset/);assert.match(api,/admin_usuario_importado/);assert.match(api,/Solo Super Admin puede importar cuentas administrativas/);assert.doesNotMatch(api,/password_hash/)})
