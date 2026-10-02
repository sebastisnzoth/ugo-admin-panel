import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo request parsing happens before authorization',async()=>{
 const chat=await read('api/hugo/chat.ts')
 const parseAt=chat.indexOf('parseHugoRequestBody(req.body)')
 const authAt=chat.indexOf('authorizeHugo(req,body)')
 assert.ok(parseAt>=0&&authAt>parseAt)
 assert.doesNotMatch(chat,/JSON\.parse\(req\.body/)
})

test('Hugo request schema rejects explicit unknown roles instead of downgrading them',async()=>{
 const request=await read('server/hugo/request.ts')
 assert.match(request,/HUGO_ROLES=new Set<HugoRequestedRole>/)
 assert.match(request,/if\(!HUGO_ROLES\.has/)
 assert.match(request,/Rol Hugo no válido/)
 assert.match(request,/roleRaw===undefined.*\?'client'/s)
})

test('Hugo request schema validates tts history and text field types',async()=>{
 const request=await read('server/hugo/request.ts')
 assert.match(request,/typeof body\.tts!=='boolean'/)
 assert.match(request,/!Array\.isArray\(body\.history\)/)
 assert.match(request,/body\.history\.length>32/)
 assert.match(request,/Cada elemento de history debe ser un objeto/)
 assert.match(request,/optionalString\(body,'message',8_000\)/)
 assert.match(request,/optionalString\(body,'context',120_000\)/)
})

test('invalid request errors are bounded to HTTP 400 with a stable code',async()=>{
 const request=await read('server/hugo/request.ts')
 assert.match(request,/status:400,code:'INVALID_REQUEST'/)
 assert.doesNotMatch(request,/console\./)
})
