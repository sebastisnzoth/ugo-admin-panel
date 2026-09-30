import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client home exposes one visible notification trigger',async()=>{
 const[home,global,css]=await Promise.all([
  read('src/features/client/home/ClientHomeScreen.tsx'),
  read('src/features/client/ui/ClientGlobalSurfaces.tsx'),
  read('src/features/client/ui/clientHomeScreen.css')
 ])
 assert.match(home,/className="ugo-home-bell"/)
 assert.match(global,/NotificationCenter role="client"/)
 assert.match(css,/ugo-client-screen-home \.ugo-notification-center\.role-client \.ugo-notification-trigger\{display:none!important\}/)
})
