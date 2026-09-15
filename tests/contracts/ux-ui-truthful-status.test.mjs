import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client home uses the canonical completed service state',async()=>{
 const home=await read('src/mvp/client/ClientPremiumHome.tsx')
 assert.match(home,/completado:'Completado'/)
 assert.match(home,/services\.filter\(item=>item\.estado==='completado'\)\.length/)
})

test('active order opens its exact detail from home in one action',async()=>{
 const[home,root]=await Promise.all([
  read('src/mvp/client/ClientPremiumHome.tsx'),
  read('src/mvp/client/ClientRoot.tsx'),
 ])
 assert.match(root,/<ClientPremiumHome onOpenService=\{openService\}\/>/)
 assert.match(home,/onOpenService\?\:\(serviceId:string\)=>void/)
 assert.match(home,/onOpenService\(latest\.id\)/)
 assert.match(home,/Abrir pedido y chat/)
})

test('client navbar exposes only working primary actions',async()=>{
 const[navbar,root,css]=await Promise.all([
  read('src/mvp/client/ClientStudioNavbar.tsx'),
  read('src/mvp/client/ClientRoot.tsx'),
  read('src/mvp/client/client-navbar-cleanup.css'),
 ])
 assert.doesNotMatch(navbar,/Recados/)
 assert.doesNotMatch(navbar,/se habilitará cuando/)
 assert.match(navbar,/ugo-studio-nav-services/)
 assert.match(navbar,/ugo-studio-nav-pro/)
 assert.match(root,/client-navbar-cleanup\.css/)
 assert.match(css,/\.ugo-studio-nav-pro/)
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
