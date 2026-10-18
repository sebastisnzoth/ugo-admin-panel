import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
assert.equal(process.env.UGO_TEST_SUPABASE_URL,'https://tmossnqfwfwjrtzwcbmm.supabase.co','UGO_TEST_ONLY')
assert.ok(process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY,'TEST_API_SERVICE_KEY_REQUIRED')
process.env.SUPABASE_URL=process.env.UGO_TEST_SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY
const root=await fs.mkdtemp(path.join(process.cwd(),'.ugo-api-runtime-'))
for(const source of ['api/operations.ts','api/admin/integrations-status.ts','src/lib/supabaseProject.ts']){
 const code=ts.transpileModule(await fs.readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
 const target=path.join(root,source.replace(/\.ts$/,'.js'))
 await fs.mkdir(path.dirname(target),{recursive:true})
 await fs.writeFile(target,code)
}
const handlers=Object.fromEntries(await Promise.all([['/api/operations','api/operations.js'],['/api/admin/integrations-status','api/admin/integrations-status.js']].map(async([route,file])=>[route,(await import(pathToFileURL(path.join(root,file)).href)).default])))
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4174')
 if(url.pathname==='/__health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({environment:'UGO TEST'}));return}
 const handler=handlers[url.pathname]
 if(!handler){res.writeHead(404);res.end();return}
 try{
  let raw=''
  for await(const chunk of req){raw+=chunk;if(raw.length>1048576){res.writeHead(413);res.end();return}}
  const response={setHeader:(name,value)=>res.setHeader(name,value),status:code=>{res.statusCode=code;return response},json:body=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));return response},end:()=>res.end()}
  await handler({method:req.method,headers:req.headers,query:Object.fromEntries(url.searchParams),body:raw?JSON.parse(raw):undefined},response)
 }catch{if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'TEST_API_REQUEST_FAILED'}))}
})
server.listen(4174,'127.0.0.1',()=>console.log('UGO exact-source TEST API ready on 127.0.0.1:4174'))
process.on('SIGTERM',()=>server.close(()=>process.exit(0)))
