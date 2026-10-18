// Report visible JSX strings not yet migrated to the existing useLocale translations.
// Informational: audit only. Does not change rendered UI or user data.
import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve('src')
const results=[]
const excluded=[]
function exclusionReason(file,text){
 if(/^(?:Hugo|U\.GO(?:\.| · ADMIN| ·)?|U\.G\.O\. ·|U\.G\.O\.|QUANTUM SERVICE OS|Quantum OS|UGO Empresas|ML|MLB|MLA|🛒 ML|🇧🇷 MLB|🇦🇷 MLA|ML →|Gmail|Gmail \(|BCC \(|Visa · 2025)$/i.test(text))return 'product or service name, platform name, or standard email/payment brand'
 if(/^(?:https?:\/\/|Auth: Header|Authorization: Bearer|pago_efectivo(?:_br|_ar)?_activo|Supabase TEST:|correlation|serviceId|GREEN ·|· correlation|· serviceId)/i.test(text))return 'technical identifier, API example, or configuration key'
 if(/^(?:\d+(?:[.,]\d+)?\s?(?:km|min|m)|⌁?\s?\d+(?:[.,]\d+)?\s?km|&lt;\s?\d+\s?km|,\d+\s?km · ETA|ETA\s+\d+\s+min|\d+[–-]\d+\s+min|Desde R\$\s?\d|R\$\s?\d|· R\$)/i.test(text))return 'numeric demo value, measurement, ETA, or currency amount'
 if(/^(?:Centro · Florianópolis|UGO · Florianópolis, SC|· Florianópolis, SC|Florianópolis, SC|Av\. Beira-Mar Norte, 540|Mariana Costa ·|Mariana · 14:31|Floripa|Canasvieiras, Floripa|João P\.|Rafael Oliveira ·|Rafael Oliveira|Lucía Barros|Roberto Silva|Mariana Costa|mariana@email\.com|rafael@pix\.com)$/i.test(text))return 'fictional/sample person, contact, or place data'
 if(/^(?:— D|— D\d+|— D\d+ ·|— D\d+ · .+)$/i.test(text))return 'department identifier rendered with a numeric value'
 if(/^(?:<supabase_session_token>|\{\{?(?:nombre|categoria|proveedor|eta|numero|zona|invite_url)\}\}?|CUSTOMER_1)$/.test(text))return 'template variable or persisted readiness identifier'
 if(/^AUTONOMY_ON ·$/.test(text))return 'persisted autonomy state enum'
 if(/^\d+ slots ·$/.test(text))return 'demo capacity count with a technical marketplace unit'
 if(/^DESCUENTO\d+$/.test(text))return 'sample discount code'
 return null
}
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
   const reason=exclusionReason(path.relative(process.cwd(),name),trimmed)
   if(reason){excluded.push({file:path.relative(process.cwd(),name),text:trimmed.slice(0,110),reason});return}
   const loc=ast.getLineAndCharacterOfPosition(node.getStart(ast))
   matches.push({line:loc.line+1,text:trimmed.slice(0,110)})
  }
  const visit=node=>{
   if(ts.isJsxText(node))add(node,node.getText(ast))
   if(ts.isJsxExpression(node)&&node.expression&&node.parent.kind!==ts.SyntaxKind.JsxAttribute){
    const inspect=value=>{
     if(ts.isStringLiteralLike(value))add(value,value.text)
     else if(ts.isConditionalExpression(value)){inspect(value.whenTrue);inspect(value.whenFalse)}
     else if(ts.isBinaryExpression(value)&&[ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken].includes(value.operatorToken.kind))inspect(value.right)
    }
    inspect(node.expression)
   }
   if(ts.isJsxAttribute(node)&&node.initializer&&ts.isStringLiteral(node.initializer)&&['aria-label','placeholder','title','alt'].includes(node.name.text))add(node,node.initializer.text)
   ts.forEachChild(node,visit)
  }
  visit(ast)
  if(matches.length)results.push({file:path.relative(process.cwd(),name),count:matches.length,examples:matches})
 }
}
walk(root)
const group=p=>p.includes('/provider/')||/Provider/.test(p)?'provider':p.includes('/client/')||/Client/.test(p)?'client':p.includes('SuperAdmin')?'superadmin':p.includes('/admin/')||/Admin/.test(p)?'admin':'shared'
const totals={}
for(const row of results)totals[group(row.file)]=(totals[group(row.file)]||0)+row.count
const actionable=Object.values(totals).reduce((a,b)=>a+b,0)
const report={filesWithUntranslatedText:results.length,estimatedVisibleLiterals:actionable,actionableVisibleLiterals:actionable,byArea:totals,files:results,excludedLiteralCount:excluded.length,exclusions:excluded}
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2))
else{console.log('UGO i18n audit — untranslated JSX literals (heuristic)');console.table(totals);console.log('Files with visible literals:',results.length);for(const row of results.slice(0,25))console.log(row.file,row.count,row.examples.map(x=>x.text).join(' | '))}
