// Validate UI references against the catalogs actually assembled by the application.
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import {loadCatalogs} from './lib/i18n-catalog.mjs'
const root=path.resolve('src'),files=[],calls=[],dynamic=[]
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,ent.name)
 if(ent.isDirectory())walk(file)
 else if(/\.(?:tsx?|jsx?)$/.test(file))files.push(file)
}}
walk(root)
for(const file of files.filter(file=>!file.startsWith(path.join(root,'i18n')+path.sep))){
 const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 function add(arg){
  const location={file:path.relative(process.cwd(),file),line:ast.getLineAndCharacterOfPosition(arg.getStart(ast)).line+1}
  if(ts.isStringLiteralLike(arg))calls.push({key:arg.text,...location})
  else if(ts.isConditionalExpression(arg)){add(arg.whenTrue);add(arg.whenFalse)}
  else dynamic.push({expression:arg.getText(ast),...location})
 }
 function visit(node){
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='t'&&node.arguments[0])add(node.arguments[0])
  if((ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node))&&node.tagName.getText(ast)==='LocalizedText')for(const attr of node.attributes.properties){
   if(attr.name?.text==='id'&&attr.initializer)add(ts.isJsxExpression(attr.initializer)?attr.initializer.expression:attr.initializer)
  }
  ts.forEachChild(node,visit)
 }
 visit(ast)
}
const catalogs=loadCatalogs(),locales=['pt-BR','es','en']
const missing=calls.flatMap(call=>locales.filter(locale=>!catalogs[locale][call.key]?.trim()||catalogs[locale][call.key]===call.key).map(locale=>({...call,locale})))
const invalid=[]
const parameters=value=>[...value.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)].map(m=>m[1]).sort().join(',')
for(const key of new Set(Object.values(catalogs).flatMap(c=>Object.keys(c))))for(const locale of locales){
 const value=catalogs[locale][key]
 if(typeof value!=='string'||!value.trim()||value===key)invalid.push({key,locale,reason:'missing or empty runtime translation'})
 else if(parameters(value)!==parameters(catalogs['pt-BR'][key]||''))invalid.push({key,locale,reason:'interpolation mismatch'})
}
console.log(JSON.stringify({filesScanned:files.length,keysUsed:new Set(calls.map(x=>x.key)).size,unresolved:missing.length,missing,invalid,dynamicReferences:dynamic},null,2))
if(missing.length||invalid.length)process.exitCode=1
