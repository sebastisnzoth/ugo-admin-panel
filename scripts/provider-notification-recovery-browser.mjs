// Consumer regression only: controlled backend/Push faults; not physical device evidence.
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const playwright=await import('playwright').catch(()=>import(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean)})))
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.match(base,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/,'LOCAL_UI_ONLY')
const browser=await (playwright.chromium||playwright.default.chromium).launch({headless:true})
const evidence={schema_version:'UGO_READINESS_EVIDENCE_V1',sha:process.env.UGO_RUNTIME_SHA||'working-tree',environment:'LOCAL_CONSUMER_REGRESSION',backend:'CONTROLLED_FAULTS',physical_audio_verified:false,physical_vibration_verified:false,production_touched:false,checks:{}}
try{
 const page=await browser.newPage()
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE_ERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text())})
 await page.route('**/src/lib/roleSupabase.ts*',route=>route.fulfill({contentType:'application/javascript',body:'export function getRoleSupabase(){return window.__noticeDb}'}))
 await page.route('**/__notification_recovery__',route=>route.fulfill({contentType:'text/html',body:`<div id="test-root"></div><script type="module">
 import React from '/node_modules/.vite/deps/react.js';
 import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
 import {NotificationCenter} from '/src/mvp/NotificationCenter.tsx';
 window.__root=ReactDOM.createRoot(document.getElementById('test-root'));
 window.__render=enabled=>window.__root.render(React.createElement(NotificationCenter,{role:'provider',attentionEnabled:enabled}));
 window.__render(true);
 </script>`}))
 await page.addInitScript(()=>{
  window.__noticeRows=[];window.__noticeReads=0;window.__channels=[];window.__removed=0;window.__toneCount=0;window.__vibrateCount=0;window.__holdReads=false;window.__heldReads=[]
  const params=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}})
  window.AudioContext=class{state='running';currentTime=0;destination={};createOscillator(){return{frequency:params(),connect(){},start(){window.__toneCount++},stop(){}}}createGain(){return{gain:params(),connect(){}}}resume(){return Promise.resolve()}}
  Object.defineProperty(navigator,'vibrate',{value:()=>{window.__vibrateCount++;return true},configurable:true})
  // A service worker that never becomes ready must not block foreground delivery.
  Object.defineProperty(navigator,'serviceWorker',{value:{ready:new Promise(()=>{})},configurable:true})
  window.PushManager=class{}
  window.Notification=class{static permission='default'}
  const realInterval=window.setInterval.bind(window)
  window.setInterval=(fn,ms,...args)=>{if(ms===20000)window.__safetyResync=fn;return realInterval(fn,ms,...args)}
  const db={auth:{getSession:async()=>({data:{session:{user:{id:'provider-test'}}}})},from:table=>{
   const query={select(){return this},eq(){return this},order(){return this},limit(){return this},in(){return this},is(){return this},update(){return this},then(resolve){
    if(window.__holdReads)return new Promise(done=>window.__heldReads.push(()=>done({data:window.__noticeRows,error:null}))).then(resolve)
    window.__noticeReads++;return Promise.resolve({data:table==='notificaciones'?window.__noticeRows:[],error:null}).then(resolve)
   }};return query
  },channel:()=>{const channel={callbacks:{},on(_type,filter,fn){this.callbacks[filter.event]=fn;return this},subscribe(fn){window.__channels.push(this);fn('SUBSCRIBED');return this}};return channel},removeChannel:async()=>{window.__removed++}}
  window.__noticeDb=db
  window.__offer=(id,ttl=300000)=>({id,tipo:'nueva_oferta',titulo:'Offer '+id,cuerpo:'TEST',datos:{oferta_id:id,servicio_id:'service-'+id,expira_at:new Date(Date.now()+ttl).toISOString()},created_at:new Date().toISOString(),leida_at:null})
  window.__emit=notice=>window.__channels.at(-1).callbacks.INSERT({new:notice})
 })
 await page.goto(base+'/__notification_recovery__')
 await page.waitForFunction(()=>window.__channels.length>0,{},{timeout:3000})
 evidence.checks.subscribed_while_push_pending=true
 // A SELECT that never resolves must not delay an INSERT alert.
 await page.evaluate(()=>{window.__holdReads=true;const n=window.__offer('first');window.__noticeRows=[n];window.__emit(n)})
 await page.getByText('Offer first',{exact:true}).waitFor({timeout:3000})
 evidence.checks.insert_alert_while_select_pending=true
 const attention=await page.evaluate(()=>({tone:window.__toneCount,vibrate:window.__vibrateCount}))
 assert.ok(attention.tone>0&&attention.vibrate>0)
 await page.evaluate(()=>window.__emit(window.__noticeRows[0]))
 assert.deepEqual(await page.evaluate(()=>({tone:window.__toneCount,vibrate:window.__vibrateCount})),attention)
 evidence.checks.duplicate_insert_does_not_repeat_attention=true
 // Mount again to release the intentionally hung SELECT. Keep the seen set.
 await page.evaluate(()=>{window.__holdReads=false;window.__render(false)})
 await page.waitForFunction(()=>window.__channels.length>=2)
 await page.getByRole('button',{name:'Cerrar notificación',exact:true}).click()
 assert.ok(await page.evaluate(()=>window.__heldReads.length>0),'DELAYED_READ_REQUIRED')
 await page.evaluate(()=>{window.__noticeRows=[window.__offer('late-offline')];window.__heldReads.splice(0).forEach(resolve=>resolve())})
 await page.waitForTimeout(100)
 assert.equal(await page.locator('.ugo-notification-live').count(),0)
 evidence.checks.retired_subscription_read_cannot_alert_offline=true
 await page.evaluate(()=>{window.__noticeRows=[window.__offer('first')];window.__render(true)})
 await page.waitForFunction(()=>window.__channels.length>=3)
 await page.evaluate(()=>{window.__noticeRows=[window.__offer('expired',-1000),window.__noticeRows[0],window.__offer('missed')];window.dispatchEvent(new Event('focus'))})
 await page.getByText('Offer missed',{exact:true}).waitFor({timeout:3000})
 evidence.checks.focus_recovers_offer_behind_expired_and_seen_notices=true
 await page.getByRole('button',{name:'Cerrar notificación',exact:true}).click()
 await page.evaluate(()=>{window.__noticeRows.push(window.__offer('periodic'));window.__safetyResync()})
 await page.getByText('Offer periodic',{exact:true}).waitFor({timeout:3000})
 evidence.checks.periodic_resync_recovers_missed_insert=true
 await page.getByRole('button',{name:'Cerrar notificación',exact:true}).click()
 await page.evaluate(()=>window.__render(false))
 await page.waitForFunction(()=>window.__channels.length>=4)
 await page.evaluate(()=>{const n=window.__offer('offline');window.__noticeRows.unshift(n);window.__emit(n)})
 assert.equal(await page.locator('.ugo-notification-live').count(),0)
 await page.evaluate(()=>window.__render(true))
 await page.getByText('Offer offline',{exact:true}).waitFor({timeout:3000})
 evidence.checks.offline_blocks_attention_online_recovers=true
 await page.evaluate(()=>window.__root.unmount())
 await page.waitForFunction(()=>window.__removed===window.__channels.length)
 evidence.checks.channels_cleaned_up=true
 assert.deepEqual(errors,[])
 evidence.result='PASS'
 await mkdir('artifacts',{recursive:true})
 await writeFile('artifacts/provider-notification-recovery-browser.json',JSON.stringify(evidence,null,2)+'\n')
 console.log(JSON.stringify(evidence))
}finally{await browser.close()}
