import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import handler from '../api/hugo/chat.ts'

const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
let statusCode=200
let payload:any=null
const headers:Record<string,string>={}
const res:any={
 setHeader(name:string,value:string){headers[name]=value;return res},
 status(code:number){statusCode=code;return res},
 json(body:unknown){payload=body;return body},
 end(){return undefined},
}
await handler({method:'POST',headers:{host:'127.0.0.1'},body:{message:'estado',role:'client'}} as any,res)
assert.equal(statusCode,401,'API auth fault must fail closed')
assert.match(String(payload?.error||''),/autenticación/i,'API must communicate cause')
assert.match(String(payload?.next_step||''),/iniciá sesión|inicia sesión/i,'API must communicate next step')
assert.match(String(payload?.hugo_mensaje||''),/autenticación/i)
assert.match(String(payload?.hugo_mensaje||''),/iniciá sesión|inicia sesión/i)
await fs.mkdir('artifacts',{recursive:true})
const result={control:'cross-errors',surface:'api',sha,environment:'LOCAL_UGO_TEST',production_touched:false,status:'PASS',fault:'AUTH_REQUIRED',status_code:statusCode,error_code:payload?.error_code||null,message:payload?.hugo_mensaje||'',next_step:payload?.next_step||'',assertions:['fail-closed-401','cause-visible','next-step-visible'],completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/cross-errors-api-runtime.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
