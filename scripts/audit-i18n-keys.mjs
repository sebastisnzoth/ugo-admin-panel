// Static coverage check for literal translation keys used in TS/TSX.
// Unlike JSX literal auditing, this detects keys rendered verbatim by t(key).
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
const root=path.resolve('src')
const catalogRoot=path.join(root,'i18n')
const files=[]
function walk(dir){
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,ent.name)
  if(ent.isDirectory())walk(p)
  else if(/\.(?:tsx?|jsx?)$/.test(p))files.push(p)
 }
}
walk(root)
const catalogs=files.filter(file=>file.startsWith(catalogRoot+path.sep))
const catalogText=catalogs.map(file=>fs.readFileSync(file,'utf8')).join('\n')
const calls=[]
for(const file of files.filter(file=>!file.startsWith(catalogRoot+path.sep))){
 const source=fs.readFileSync(file,'utf8')
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 function visit(node){
  if(ts.isCallExpression(node)&&node.arguments.length&&ts.isIdentifier(node.expression)&&node.expression.text==='t'){
   const arg=node.arguments[0]
   if(ts.isStringLiteral(arg)||ts.isNoSubstitutionTemplateLiteral(arg)){
    const key=arg.text
    const line=ast.getLineAndCharacterOfPosition(arg.getStart(ast)).line+1
    calls.push({key,file:path.relative(process.cwd(),file),line})
   }
  }
  ts.forEachChild(node,visit)
 }
 visit(ast)
}
const missing=calls.filter(({key})=>!catalogText.includes(JSON.stringify(key))&&!catalogText.includes("'"+key.replaceAll("'","\\'")+"'"))
const report={filesScanned:files.length,keysUsed:[...new Set(calls.map(x=>x.key))].length,unresolved:missing.length,missing}
console.log(JSON.stringify(report,null,2))
if(process.argv.includes('--strict')&&missing.length)process.exitCode=1
