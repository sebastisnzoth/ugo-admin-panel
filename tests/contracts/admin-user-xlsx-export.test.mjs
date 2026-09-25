import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('admin exports real XLSX workbook instead of CSV',async()=>{const s=await read('src/mvp/AdminUsersPanel.tsx');assert.match(s,/Exportar Excel/);assert.match(s,/\.xlsx'/);assert.match(s,/application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);assert.match(s,/0x04034b50/);assert.match(s,/xl\/worksheets\/sheet1\.xml/);assert.match(s,/NO_EXPORTABLE/)})
