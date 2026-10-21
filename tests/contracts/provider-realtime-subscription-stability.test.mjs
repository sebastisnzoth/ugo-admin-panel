import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const realtime=readFileSync('src/mvp/provider/useProviderRealtime.ts','utf8')
const auth=readFileSync('src/mvp/shared.tsx','utf8')
test('provider Realtime subscription does not restart on every render with a new callback',()=>{
 assert.match(realtime,/const onChangeRef=useRef\(onChange\)/)
 assert.match(realtime,/onChangeRef\.current=onChange/)
 assert.match(realtime,/onChangeRef\.current\(\)/)
 assert.match(realtime,/\[channelEpoch,supabase,userId\]/)
 assert.doesNotMatch(realtime,/\[channelEpoch,onChange,supabase,userId\]/)
})
test('profile channel stays stable across token refresh with same user id',()=>{
 assert.match(auth,/const profileSessionRef=useRef\(session\)/)
 assert.match(auth,/profileSessionRef\.current=session/)
 assert.match(auth,/const profileUserId=session\?\.user\.id/)
 assert.match(auth,/\[loadProfile,profileChannelEpoch,profileChannelInstance,role,profileUserId,supabase\]/)
 assert.doesNotMatch(auth,/\[loadProfile,profileChannelEpoch,profileChannelInstance,role,session,supabase\]/)
})
