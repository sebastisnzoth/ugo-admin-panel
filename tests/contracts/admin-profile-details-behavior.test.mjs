import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'
const source=await fs.readFile(new URL('../../src/mvp/AdminUsersPanel.tsx',import.meta.url),'utf8')
const expression=source.slice(source.indexOf('async function saveEdit('),source.indexOf('async function setActive('))
const js=ts.transpileModule(expression,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
async function save(tipo,options={}){
 const rows={usuarios:{id:'target',nombre:'Before'},perfiles_cliente:{usuario_id:'target'},perfiles_proveedor:{usuario_id:'target'}}
 const writes=[];let message='',closed=false
 const db={from:table=>{let patch=null;const q={update:value=>{patch=value;return q},eq:()=>q,select:()=>q,maybeSingle:async()=>{if(patch){writes.push({table,patch});if(options.zeroTable===table)return {data:null,error:null};Object.assign(rows[table],patch)}return {data:rows[table],error:null}}};return q}}
 const values={supabase:db,editing:{id:'target',tipo},canMutate:()=>true,editName:'Saved',editSurname:'Test',editCountry:'BR',editZone:'North',editDetails:{phone:'48999999999',address:'Rua TEST',neighborhood:'Canasvieiras',city:'Florianópolis',photoUrl:'https://example.com/photo.png',bio:'QA provider',experience:'7',categoryIds:['cat-a'],primaryCategory:'cat-a'},setBusy:()=>{},setMessage:value=>{message=value},setEditing:()=>{closed=true},load:async()=>{},t:key=>key}
 const handler=new Function(...Object.keys(values),js+';return saveEdit')(...Object.values(values))
 await handler({preventDefault(){}})
 return {writes,rows,message,closed}
}
test('editing a client persists contact and address in the client profile',async()=>{const r=await save('cliente');assert.ok(r.writes.some(w=>w.table==='perfiles_cliente'));assert.equal(r.rows.perfiles_cliente.telefono,'48999999999');assert.equal(r.rows.perfiles_cliente.direccion,'Rua TEST');assert.equal(r.rows.perfiles_cliente.barrio,'Canasvieiras');assert.equal(r.rows.perfiles_cliente.ciudad,'Florianópolis');assert.equal(r.closed,true)})
test('editing a provider persists professional contact and biography',async()=>{const r=await save('proveedor');assert.equal(r.rows.perfiles_proveedor.telefono_profesional,'48999999999');assert.equal(r.rows.perfiles_proveedor.ciudad_base,'Florianópolis');assert.equal(r.rows.perfiles_proveedor.bio,'QA provider');assert.equal(r.rows.perfiles_proveedor.experiencia_anos,7);assert.deepEqual(r.rows.usuarios.categorias_ids,['cat-a']);assert.equal(r.rows.perfiles_proveedor.categoria_principal_id,'cat-a');assert.equal(r.closed,true)})
test('zero affected client profiles keeps editor open and reports failure',async()=>{const r=await save('cliente',{zeroTable:'perfiles_cliente'});assert.equal(r.closed,false);assert.ok(r.message);assert.doesNotMatch(r.message,/actualizados y verificados/)})
test('administrative contact and profile photo are persisted on usuarios',async()=>{const r=await save('admin');assert.equal(r.rows.usuarios.telefono,'48999999999');assert.equal(r.rows.usuarios.foto_url,'https://example.com/photo.png');assert.equal(r.writes.length,1)})
