import{chromium}from'playwright'
import axe from'axe-core'
import{mkdir,writeFile}from'node:fs/promises'

const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
const sha=process.env.UGO_RUNTIME_SHA||'unknown'
const routes=[
 {id:'landing',url:'/'},
 {id:'client',url:'/?app=client'},
 {id:'provider',url:'/?app=provider'},
 {id:'admin',url:'/?app=admin'},
]
const browser=await chromium.launch({headless:true})
const results=[]
try{
 for(const route of routes){
  const page=await browser.newPage({viewport:{width:390,height:844}})
  const consoleErrors=[]
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())})
  await page.goto(base+route.url,{waitUntil:'networkidle',timeout:30000})
  await page.addScriptTag({content:axe.source})
  const axeResult=await page.evaluate(async()=>await globalThis.axe.run(document,{
   runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']},
   rules:{'color-contrast':{enabled:true}}
  }))
  const labels=await page.evaluate(()=>{
   const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0}
   const fields=[...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(visible)
   const unlabeled=fields.filter(el=>!(el.labels?.length||el.getAttribute('aria-label')||el.getAttribute('aria-labelledby'))).map(el=>el.outerHTML.slice(0,180))
   const controls=[...document.querySelectorAll('button,[role="button"],[role="tab"]')].filter(visible)
   const unnamed=controls.filter(el=>!((el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.getAttribute('title')||el.textContent||'').trim())).map(el=>el.outerHTML.slice(0,180))
   const undersized=controls.map(el=>({el,r:el.getBoundingClientRect()})).filter(x=>x.r.width<44||x.r.height<44).map(x=>({html:x.el.outerHTML.slice(0,180),width:Math.round(x.r.width),height:Math.round(x.r.height)}))
   return{unlabeled,unnamed,undersized}
  })
  const focusTrail=[]
  for(let i=0;i<10;i++){
   await page.keyboard.press('Tab')
   const entry=await page.evaluate(()=>{
    const el=document.activeElement
    if(!(el instanceof HTMLElement))return null
    const r=el.getBoundingClientRect(),s=getComputedStyle(el)
    return{tag:el.tagName,name:(el.getAttribute('aria-label')||el.textContent||el.getAttribute('name')||'').trim().slice(0,100),visible:r.width>0&&r.height>0,outline:s.outlineStyle!=='none'&&s.outlineWidth!=='0px'}
   })
   if(entry)focusTrail.push(entry)
  }
  const serious=axeResult.violations.filter(v=>['serious','critical'].includes(v.impact||''))
  const focusOk=focusTrail.some(x=>x.visible&&x.outline)
  results.push({route:route.id,url:page.url(),violations:serious.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.slice(0,5).map(n=>n.target)})),labels,focusTrail,focusOk,consoleErrors})
  await page.close()
 }
}finally{await browser.close()}
const pass=results.every(r=>r.violations.length===0&&r.labels.unlabeled.length===0&&r.labels.unnamed.length===0&&r.labels.undersized.length===0&&r.focusOk)
const evidence={readiness_id:'cross-accessibility',tested_sha:sha,environment:'UGO_TEST_BROWSER_RUNTIME',production_touched:false,checks:{keyboard_focus:'browser-tab-sequence',labels:'DOM accessible names',touch_targets:'44x44 CSS pixels for visible button/tab controls',contrast:'axe WCAG AA'},routes:results,result:pass?'PASS':'FAIL',completed_at:new Date().toISOString()}
await mkdir('artifacts',{recursive:true})
await writeFile(`artifacts/cross-accessibility-runtime-${sha}.json`,JSON.stringify(evidence,null,2)+'\n')
if(!pass){console.error(JSON.stringify(evidence,null,2));process.exit(1)}
console.log(JSON.stringify(evidence,null,2))
