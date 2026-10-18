import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

test('Super Admin preserves autonomy gate rejection after refresh',async()=>{
 const source=await readFile(new URL('../../src/mvp/SuperAdminCommandCenter.tsx',import.meta.url),'utf8')
 const action=source.split('const handleAutonomyModeChange=async')[1]?.split('; if(!authorized&&!loading)')[0]
 assert.ok(action)
 assert.match(action,/await load\(\);setError\('No se puede activar Empresa Autónoma:/)
 assert.match(action,/await load\(\);setError\('No se cambió el modo de autonomía:/)
 assert.match(action,/await load\(\);setError\('No se pudo verificar\/activar Empresa Autónoma:/)
})
