import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const data=readFileSync('src/mvp/provider/providerData.tsx','utf8')
const root=readFileSync('src/mvp/provider/ProviderRoot.tsx','utf8')
test('snapshot loading and errors do not silently present empty operational data',()=>{
 assert.match(data,/loadProviderSnapshot\(supabase,session\.user\.id\)\.catch\(error=>\{setSnapshotError\(true\)/)
 assert.match(data,/setSnapshotLoaded\(true\);setSnapshotError\(false\)/)
 assert.match(root,/!data\.snapshotLoaded&&screen!=='profile'&&screen!=='history'/)
 assert.match(root,/providerRuntime\.snapshotStale/)
 assert.match(root,/data\.reload\(\)\.catch\(\(\)=>\{\}\)/)
})
