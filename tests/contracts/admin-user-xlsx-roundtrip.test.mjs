import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
test('admin user import and export use XLSX only',async()=>{const s=await readFile(new URL('../../src/mvp/AdminUsersPanel.tsx',import.meta.url),'utf8');assert.match(s,/Importar Excel/);assert.match(s,/Exportar Excel/);assert.match(s,/accept="\.xlsx,application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet"/);assert.match(s,/parseXlsxUsers/);assert.match(s,/ugo-usuarios-'\+new Date\(\)\.toISOString\(\)\.slice\(0,10\)\+'\.xlsx'/);assert.doesNotMatch(s,/Importar CSV/)})
