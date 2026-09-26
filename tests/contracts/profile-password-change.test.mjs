import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client profile can change authenticated password',async()=>{
 const src=await read('src/features/client/profile/ClientProfilePanel.tsx')
 assert.match(src,/supabase\.auth\.updateUser\(\{password\}\)/)
 assert.match(src,/Cambiar contraseña/)
 assert.match(src,/autoComplete="new-password"/)
})

test('provider profile can change authenticated password',async()=>{
 const data=await read('src/mvp/provider/providerData.tsx')
 const profile=await read('src/mvp/provider/ProviderProfile.tsx')
 assert.match(data,/supabase\.auth\.updateUser\(\{password\}\)/)
 assert.match(data,/changePassword:\(password:string\)=>Promise<boolean>/)
 assert.match(profile,/Cambiar contraseña/)
 assert.match(profile,/d\.changePassword\(password\)/)
})
