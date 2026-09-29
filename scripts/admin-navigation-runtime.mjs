import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co';
const url=process.env.UGO_TEST_SUPABASE_URL||'';
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'';
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'';
const email=process.env.UGO_TEST_ADMIN_EMAIL||'';
const password=process.env.UGO_TEST_ADMIN_PASSWORD||'';
const sha=process.env.UGO_RUNTIME_SHA||'';
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173';

assert.equal(url,TEST_URL,'UGO_TEST_ONLY');
assert.ok(anon&&serviceKey&&email&&password&&sha,'UGO_TEST_RUNTIME_INPUTS_REQUIRED');

const privileged=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const user=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:login,error:loginError}=await user.auth.signInWithPassword({email,password});
assert.ifError(loginError);
assert.ok(login.user&&login.session,'UGO_TEST_ADMIN_SESSION_REQUIRED');
const {data:profile,error:profileError}=await privileged.from('usuarios').select('tipo,activo').eq('id',login.user.id).single();
assert.ifError(profileError);
assert.equal(profile?.tipo,'superadmin','UGO_TEST_SUPERADMIN_REQUIRED');
assert.equal(profile?.activo,true,'UGO_TEST_SUPERADMIN_ACTIVE_REQUIRED');

await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(String(error?.message||error)));

const clickMap=[];
const inventory=[];
const sections=[
 {name:'Inicio',sub:null},
 {name:'Operaciones',sub:['Resumen','Mapa','Servicios','Alertas','Disputas','Scout','Historial','Mensajes']},
 {name:'Personas',sub:['Usuarios','Verificación','Documentos','KYC','Importar']},
 {name:'Finanzas',sub:['PIX','Bóveda y retiros','Tarifas']},
 {name:'Configuración',sub:['Categorías','Analytics','Notificaciones','Reportes','Sistema']},
 {name:'Super Admin',sub:['Empresa Autónoma','QA Lab','Model Router','Riesgo & Auditoría','UGO Empresas','Ledgers','Launch Gate']}
];

async function snap(label){
 const buttons=await page.locator('button:visible').evaluateAll(nodes=>nodes.map((node,index)=>({
  index,
  label:(node.getAttribute('aria-label')||node.textContent||'').replace(/\s+/g,' ').trim(),
  disabled:node.disabled,
  ariaPressed:node.getAttribute('aria-pressed'),
  ariaCurrent:node.getAttribute('aria-current')
 })));
 assert.ok(buttons.every(b=>b.label.length>0),label+': visible button without accessible label');
 inventory.push({view:label,buttons});
 return buttons;
}
async function clickNamed(name,scope){
 const errorsBefore=pageErrors.length;
 const root=scope?page.getByRole('group',{name:scope}):page.getByRole('navigation',{name:'Navegación Admin'});
 const button=root.getByRole('button',{name,exact:false}).first();
 await button.waitFor({state:'visible',timeout:20000});
 assert.equal(await button.isDisabled(),false,name+': unexpectedly disabled');
 await button.click();
 await page.waitForTimeout(250);
 assert.equal(pageErrors.length,errorsBefore,name+': pageerror after click');
 clickMap.push({control:name,scope:scope||'Navegación Admin',result:'PASS'});
}
async function assertGroupUnique(groupName){
 const labels=await page.getByRole('group',{name:groupName}).getByRole('button').allTextContents();
 const normalized=labels.map(v=>v.replace(/\s+/g,' ').trim().toLowerCase());
 assert.equal(new Set(normalized).size,normalized.length,groupName+': duplicate actions');
}

try{
 await page.addInitScript(({key,value})=>window.localStorage.setItem(key,value),{key:'ugo-test-admin-auth',value:JSON.stringify(login.session)});
 await page.goto(base+'/?app=admin',{waitUntil:'networkidle'});
 await page.getByRole('navigation',{name:'Navegación Admin'}).waitFor({state:'visible',timeout:20000});
 await page.getByRole('button',{name:'Super Admin',exact:false}).waitFor({state:'visible',timeout:20000});

 for(const section of sections){
   await clickNamed(section.name,null);
   if(section.name==='Super Admin') await page.getByText('Control global de UGO',{exact:true}).waitFor({state:'visible',timeout:20000});
   if(section.sub){
     const group=section.name==='Operaciones'?'Menú de operaciones':section.name==='Personas'?'Personas':section.name==='Finanzas'?'Finanzas':section.name==='Configuración'?'Configuración':null;
     if(group) await assertGroupUnique(group);
     for(const child of section.sub){
       if(group) await clickNamed(child,group);
       else {
         const errorsBefore=pageErrors.length;
         const btn=page.getByRole('button',{name:child,exact:true});
         await btn.waitFor({state:'visible',timeout:20000});
         await btn.click();
         await page.waitForTimeout(250);
         assert.equal(pageErrors.length,errorsBefore,child+': pageerror after click');
         clickMap.push({control:child,scope:'Super Admin',result:'PASS'});
       }
       await snap(section.name+' > '+child);
     }
   }else await snap(section.name);
 }

 const refresh=page.getByRole('button',{name:'Actualizar',exact:false}).first();
 await refresh.waitFor({state:'visible'});
 await refresh.click();
 await page.waitForTimeout(500);
 clickMap.push({control:'Actualizar',scope:'Header Admin',result:'PASS'});

 const allMenuLabels=sections.flatMap(s=>[s.name,...(s.sub||[])]);
 assert.equal(clickMap.filter(x=>allMenuLabels.includes(x.control)).length,allMenuLabels.length,'navigation click coverage incomplete');
 assert.equal(pageErrors.length,0,'runtime page errors detected');

 await page.screenshot({path:'artifacts/admin-navigation-runtime.png',fullPage:true});
 const evidence={
   readiness_id:'admin-navigation',
   task_id:'readiness-admin-navigation',
   job_id:'UGO-READINESS-ADMIN-NAVIGATION',
   correlation_id:'readiness-admin-navigation-20260929T212000Z-d68ed824',
   environment:'UGO TEST',
   sha,
   tested_url:base+'/?app=admin',
   actor_role:profile.tipo,
   expected_navigation_controls:allMenuLabels.length,
   clicked_navigation_controls:clickMap.filter(x=>allMenuLabels.includes(x.control)).length,
   click_map:clickMap,
   button_inventory:inventory,
   duplicate_navigation_actions:'NONE',
   page_errors:pageErrors,
   result:'PASS',
   completed_at:new Date().toISOString()
 };
 await fs.writeFile('artifacts/admin-navigation-runtime.json',JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',sha,controls:evidence.clicked_navigation_controls,views:inventory.length}));
}catch(error){
 await page.screenshot({path:'artifacts/admin-navigation-failure.png',fullPage:true}).catch(()=>{});
 await fs.writeFile('artifacts/admin-navigation-failure.txt',String(error?.stack||error)+'\n').catch(()=>{});
 throw error;
}finally{
 await browser.close();
 await user.auth.signOut();
}
