import{readFileSync}from'node:fs'
import{resolve}from'node:path'

const TEST_REF='tmossnqfwfwjrtzwcbmm'
const PROD_REF='trfsjuseqjxlhrxuvdsm'
const root=resolve(new URL('..',import.meta.url).pathname)
const read=path=>readFileSync(resolve(root,path),'utf8')
const fail=message=>{console.error(`UGO TEST environment guard: ${message}`);process.exitCode=1}

for(const[key,value]of Object.entries(process.env)){
 if(!value||!key.toUpperCase().includes('SUPABASE'))continue
 if(String(value).includes(PROD_REF))fail(`${key} apunta al proyecto de producción ${PROD_REF}.`)
}

for(const path of['src/lib/supabaseProject.ts','api/proxy.js','api/operations.ts','vercel.json']){
 const source=read(path)
 if(!source.includes(TEST_REF))fail(`${path} no está fijado a UGO TEST (${TEST_REF}).`)
 if(source.includes(PROD_REF))fail(`${path} contiene una referencia directa al proyecto de producción (${PROD_REF}).`)
}

const project=read('src/lib/supabaseProject.ts')
if(!/UGO_ENVIRONMENT\s*=\s*['"]test['"]/.test(project))fail('src/lib/supabaseProject.ts debe declarar UGO_ENVIRONMENT=test.')
if(!/UGO_SUPABASE_PROJECT_REF\s*=\s*['"]tmossnqfwfwjrtzwcbmm['"]/.test(project))fail('El SDK del navegador debe usar exclusivamente el ref de UGO TEST.')

if(!process.exitCode)console.log(`UGO TEST environment guard OK · ${TEST_REF}`)
