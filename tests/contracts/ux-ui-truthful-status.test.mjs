import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client home uses the canonical completed service state',async()=>{
 const home=await read('src/mvp/client/ClientPremiumHome.tsx')
 assert.match(home,/completado:'Completado'/)
 assert.match(home,/services\.filter\(item=>item\.estado==='completado'\)\.length/)
})

test('development dashboard gives validated a distinct visual state',async()=>{
 const[main,css]=await Promise.all([
  read('src/main.tsx'),
  read('src/mvp/development-dashboard-status.css'),
 ])
 assert.match(main,/development-dashboard-status\.css/)
 assert.match(css,/\.devdash-task\.status-validated/)
 assert.match(css,/\.devdash-pill\.status-validated/)
 assert.match(css,/\.event-dot\.status-validated/)
})
