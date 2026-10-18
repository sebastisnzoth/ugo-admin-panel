import {createRequire} from 'node:module'
import {spawn} from 'node:child_process'
const require=createRequire(process.cwd()+'/package.json'),{chromium}=require('playwright')
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4181'],{stdio:'pipe'})
let browser
try{
 for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:4181/');break}catch{await new Promise(r=>setTimeout(r,150))}}
 browser=await chromium.launch({headless:true})
 for(const role of ['client','provider','admin','superadmin']){
  const page=await browser.newPage({viewport:{width:390,height:844}})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:4181/?app='+role)
  await page.getByTestId('language-selector').waitFor({timeout:20000})
  for(const locale of ['pt-BR','es','en']){
   await page.getByTestId('language-selector').selectOption(locale)
   await page.waitForFunction(l=>document.documentElement.lang===l,locale)
   console.log(role,locale,await page.locator('h1').innerText())
   await page.reload();await page.getByTestId('language-selector').waitFor()
   if(await page.locator('html').getAttribute('lang')!==locale)throw new Error('LOCALE_RELOAD_FAILED '+role)
   const body=await page.locator('body').innerText();if(/(?:clientNeed|screen\.need|clientAssigned|clientSummary)\.[a-zA-Z0-9]+/.test(body))throw new Error('VISIBLE_KEY '+role)
  }
  if(errors.length)throw new Error(errors.join(' | '))
  await page.close()
 }
}finally{await browser?.close();server.kill()}
