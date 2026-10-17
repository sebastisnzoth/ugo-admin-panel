// Report visible JSX strings not yet migrated to the existing useLocale translations.
// Informational: audit only. Does not change rendered UI or user data.
import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve('src')
const results=[]
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.name==='node_modules'||entry.name.startsWith('.'))continue
  const name=path.join(dir,entry.name)
  if(entry.isDirectory()){walk(name);continue}
  if(!name.endsWith('.tsx'))continue
  const source=fs.readFileSync(name,'utf8')
  const ast=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  const matches=[]
  const add=(node,value)=>{
   const trimmed=value.replace(/\s+/g,' ').trim()
   if(!trimmed||!/\p{L}/u.test(trimmed)||trimmed.length<3)return
   if(/^[-_A-Z0-9 .·]+$/.test(trimmed)&&trimmed.length<6)return
   const loc=ast.getLineAndCharacterOfPosition(node.getStart(ast))
   matches.push({line:loc.line+1,text:trimmed.slice(0,110)})
  }
  const visit=node=>{
   if(ts.isJsxText(node))add(node,node.getText(ast))
   if(ts.isJsxAttribute(node)&&node.initializer&&ts.isStringLiteral(node.initializer)&&['aria-label','placeholder','title','alt'].includes(node.name.text))add(node,node.initializer.text)
   ts.forEachChild(node,visit)
  }
  visit(ast)
  if(matches.length)results.push({file:path.relative(process.cwd(),name),count:matches.length,examples:matches.slice(0,5)})
 }
}
walk(root)
const group=p=>p.includes('/provider/')||/Provider/.test(p)?'provider':p.includes('/client/')||/Client/.test(p)?'client':p.includes('SuperAdmin')?'superadmin':p.includes('/admin/')||/Admin/.test(p)?'admin':'shared'
const totals={}
for(const row of results)totals[group(row.file)]=(totals[group(row.file)]||0)+row.count
const report={filesWithUntranslatedText:results.length,estimatedVisibleLiterals:Object.values(totals).reduce((a,b)=>a+b,0),byArea:totals,files:results}
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2))
else{console.log('UGO i18n audit — untranslated JSX literals (heuristic)');console.table(totals);console.log('Files with visible literals:',results.length);for(const row of results.slice(0,25))console.log(row.file,row.count,row.examples.map(x=>x.text).join(' | '))}
