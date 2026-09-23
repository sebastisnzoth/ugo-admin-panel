import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs/promises'

const read=path=>fs.readFile(new URL('../../'+path,import.meta.url),'utf8')

test('client service detail lives behind the order feature boundary',async()=>{
 const[legacy,canonical,boundary]=await Promise.all([
  read('src/mvp/client/ClientServiceDetail.tsx'),
  read('src/features/client/order/ClientServiceDetail.tsx'),
  read('src/features/client/ui/ClientOrderDetailBoundary.tsx')
 ])
 assert.equal(legacy.trim(),"export {ClientServiceDetail as default,ClientServiceDetail} from '../../features/client/order/ClientServiceDetail'")
 assert.match(canonical,/export function ClientServiceDetail/)
 assert.match(canonical,/from'\.\.\/rating\/ClientRatingPrompt'/)
 assert.match(canonical,/from'\.\.\/flow\/clientFlow'/)
 assert.match(canonical,/from'..\/payments\/ClientPaymentChoice'/);
 assert.match(boundary,/from'\.\.\/order\/ClientServiceDetail'/)
 assert.doesNotMatch(boundary,/mvp\/client\/ClientServiceDetail/)
})
