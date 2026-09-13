import{readFileSync,readdirSync}from'node:fs'
import{resolve,relative}from'node:path'
import{fileURLToPath}from'node:url'

const TEST_REF='tmossnqfwfwjrtzwcbmm'
const PROD_REF='trfsjuseqjxlhrxuvdsm'
const root=resolve(fileURLToPath(new URL('..',import.meta.url)))
const read=path=>readFileSync(resolve(root,path),'utf8')
const fail=message=>{console.error(`UGO TEST environment guard: ${message}`);process.exitCode=1}
const runtimeExtension=/\.(?:js|jsx|ts|tsx|mjs|cjs)$/i

function runtimeFiles(dir){
 const absolute=resolve(root,dir)
 const out=[]
 for(const entry of readdirSync(absolute,{withFileTypes:true})){
  const child=resolve(absolute,entry.name)
  if(entry.isDirectory())out.push(...runtimeFiles(relative(root,child)))
  else if(entry.isFile()&&runtimeExtension.test(entry.name))out.push(relative(root,child))
 }
 return out
}

for(const[key,value]of Object.entries(process.env)){
 if(!value||!key.toUpperCase().includes('SUPABASE'))continue
 if(String(value).includes(PROD_REF))fail(`${key} apunta al proyecto de producción ${PROD_REF}.`)
}

const runtimePaths=[...runtimeFiles('api'),...runtimeFiles('src'),'vercel.json']
for(const path of runtimePaths){
 const source=read(path)
 if(source.includes(PROD_REF))fail(`${path} contiene una referencia directa al proyecto de producción (${PROD_REF}).`)
}

for(const path of['src/lib/supabaseProject.ts','api/proxy.js','api/operations.ts','vercel.json']){
 const source=read(path)
 if(!source.includes(TEST_REF))fail(`${path} no está fijado a UGO TEST (${TEST_REF}).`)
}

const project=read('src/lib/supabaseProject.ts')
if(!/UGO_ENVIRONMENT\s*=\s*['"]test['"]/.test(project))fail('src/lib/supabaseProject.ts debe declarar UGO_ENVIRONMENT=test.')
if(!/UGO_SUPABASE_PROJECT_REF\s*=\s*['"]tmossnqfwfwjrtzwcbmm['"]/.test(project))fail('El SDK del navegador debe usar exclusivamente el ref de UGO TEST.')

const vercel=read('vercel.json')
if(!/"SUPABASE_URL"\s*:\s*"https:\/\/tmossnqfwfwjrtzwcbmm\.supabase\.co"/.test(vercel))fail('Vercel debe fijar SUPABASE_URL al proyecto UGO TEST.')

if(!process.exitCode)console.log(`UGO TEST environment guard OK · ${TEST_REF} · ${runtimePaths.length} runtime files checked`)
