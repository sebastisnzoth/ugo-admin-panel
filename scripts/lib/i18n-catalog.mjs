// Evaluate the catalogs assembled by the application, including spread/import order.
// Browser/auth modules are not executed; only the locale data module is evaluated.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
export function loadCatalogs(){
 const cache=new Map()
 function load(file){
  file=path.resolve(file)
  if(cache.has(file))return cache.get(file)
  const module={exports:{}}
  cache.set(file,module.exports)
  let source=fs.readFileSync(file,'utf8')
  if(file.endsWith('/locale.tsx'))source+='\nexport {messages};'
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText
  vm.runInNewContext(code,{module,exports:module.exports,require:specifier=>{
   if(specifier==='react')return {createContext:()=>({})}
   if(specifier.includes('lib/'))return {}
   return load(path.resolve(path.dirname(file),specifier+'.ts'))
  }},{filename:file})
  return module.exports
 }
 return load('src/i18n/locale.tsx').messages
}
