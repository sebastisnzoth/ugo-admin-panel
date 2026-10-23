#!/usr/bin/env node
// Static dependency preflight ONLY. Never connects to a database or executes SQL.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(process.cwd());
const manifest=JSON.parse(readFileSync(resolve(root,'docs/ugo-hive/PROD_AUTONOMY_HIVE_DEPENDENCY_CANDIDATES.json'),'utf8'));
if(manifest.apply_to_production!==false) throw Error('FAIL_CLOSED: manifest must prohibit production execution');
const files=manifest.files||[];
const failures=[];
const output=[];
const objectRe=/\b(?:references|from|join|update|into|table|function)\s+(?:if\s+(?:not\s+)?exists\s+)?(?:(public|private|auth|storage)\.)?([a-z_][a-z0-9_]*)/gi;
const indexed=new Map();
for(const [index,item] of files.entries()){
 if(typeof item.path!=='string'||!/^supabase\/migrations\/[a-zA-Z0-9_.-]+\.sql$/.test(item.path)){ failures.push('Invalid path at '+index);continue;}
 const f=resolve(root,item.path);
 if(!f.startsWith(root+'/')||!existsSync(f)){failures.push('Missing file '+item.path);continue;}
 const sql=readFileSync(f,'utf8');
 const refs=[...sql.matchAll(objectRe)].map(m=>(m[1]||'public')+'.'+m[2].toLowerCase());
 const creates=[...sql.matchAll(/\bcreate\s+(?:or\s+replace\s+)?(?:table|function)\s+(?:if\s+not\s+exists\s+)?(?:(public|private)\.)?([a-z_][a-z0-9_]*)/gi)].map(m=>(m[1]||'public')+'.'+m[2].toLowerCase());
 for(const name of creates){if(!indexed.has(name))indexed.set(name,index)}
 output.push({path:item.path,refs:[...new Set(refs)],creates:[...new Set(creates)]});
}
const report=output.map((x,i)=>({file:x.path,created_objects:x.creates.length,referenced_objects:x.refs.length,external_or_forward_references:x.refs.filter(name=>!indexed.has(name)||indexed.get(name)>i).slice(0,60)}));
console.log(JSON.stringify({mode:'STATIC_READ_ONLY',safe_to_apply:false,files_checked:output.length,errors:failures,dependencies:report},null,2));
if(failures.length)process.exitCode=1;
