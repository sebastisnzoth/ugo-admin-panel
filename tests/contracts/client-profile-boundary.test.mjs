import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client profile rendering lives behind the profile feature boundary',async()=>{const[root,panel]=await Promise.all([read('src/features/client/ClientRoot.tsx'),read('src/features/client/profile/ClientProfilePanel.tsx')]);assert.match(root,/features\/client\/profile\/ClientProfilePanel/);assert.doesNotMatch(root,/from'\.\/ClientProfilePanel'/);assert.match(panel,/useRoleSession/);assert.match(panel,/useClientFlow/);assert.match(panel,/clientProfilePanel\.css/);assert.match(panel,/perfiles_cliente/);assert.match(panel,/preferencias_pago_cliente/);assert.match(panel,/direcciones_cliente/)})
