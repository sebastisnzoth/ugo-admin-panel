import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs/promises'

const read=path=>fs.readFile(new URL('../../'+path,import.meta.url),'utf8')

test('client summary screen lives behind the request feature boundary',async()=>{
 const[legacy,legacyCss,canonical,canonicalCss]=await Promise.all([
  read('src/mvp/client/ClientSummaryScreen.tsx'),
  read('src/mvp/client/client-summary-screen.css'),
  read('src/features/client/request/ClientSummaryScreen.tsx'),
  read('src/features/client/request/clientSummaryScreen.css')
 ])
 assert.equal(legacy.trim(),"export {ClientSummaryScreen as default,ClientSummaryScreen} from '../../features/client/request/ClientSummaryScreen'")
 assert.equal(legacyCss.trim(),"@import '../../features/client/request/clientSummaryScreen.css';")
 assert.match(canonical,/export function ClientSummaryScreen/)
 assert.match(canonical,/from'\.\.\/\.\.\/\.\.\/mvp\/shared'/)
 assert.match(canonical,/from'\.\.\/\.\.\/\.\.\/mvp\/uiEvents'/)
 assert.match(canonical,/import'\.\/clientSummaryScreen\.css'/)
 assert.match(canonicalCss,/\.ugo-summary-screen/)
})
