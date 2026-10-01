import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'

const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
await fs.mkdir('artifacts',{recursive:true})

const browser=await chromium.launch({headless:true})
const results=[]
try{
 for(const role of ['client','provider','admin']){
  const page=await browser.newPage({viewport:{width:390,height:844}})
  const events=[]
  await page.addInitScript(()=>{
   class MockSpeechRecognition{
    continuous=false
    interimResults=false
    lang='es-AR'
    maxAlternatives=1
    onstart=null
    onspeechstart=null
    onend=null
    onresult=null
    onerror=null
    _stopped=false
    start(){
     this._stopped=false
     queueMicrotask(()=>this.onstart?.())
     setTimeout(()=>{
      if(this._stopped)return
      this.onspeechstart?.()
      const item={0:{transcript:'necesito un plomero'},length:1,isFinal:true}
      this.onresult?.({resultIndex:0,results:[item]})
     },80)
    }
    stop(){this._stopped=true;queueMicrotask(()=>this.onend?.())}
    abort(){this._stopped=true;queueMicrotask(()=>this.onend?.())}
   }
   Object.defineProperty(window,'SpeechRecognition',{value:MockSpeechRecognition,configurable:true})
   Object.defineProperty(window,'webkitSpeechRecognition',{value:MockSpeechRecognition,configurable:true})
   Object.defineProperty(navigator,'mediaDevices',{value:undefined,configurable:true})
  })
  await page.goto(base+'/?app='+role,{waitUntil:'domcontentloaded'})
  await page.waitForFunction(()=>Boolean(window.UGOVoiceBridge),null,{timeout:15000})
  await page.evaluate(()=>{
   window.__ugoVoiceRuntimeEvents=[]
   for(const name of['ugo:native-voice-state','ugo:native-voice-result','ugo:native-voice-error']){
    window.addEventListener(name,event=>window.__ugoVoiceRuntimeEvents.push({name,detail:event.detail||{}}))
   }
  })
  const available=await page.evaluate(()=>window.UGOVoiceBridge?.isAvailable?.()===true)
  assert.equal(available,true,role+' bridge must report available with browser speech')
  await page.evaluate(async()=>{await window.UGOVoiceBridge.startListening()})
  await page.waitForFunction(()=>window.__ugoVoiceRuntimeEvents?.some(item=>item.name==='ugo:native-voice-result'&&item.detail?.final===true&&item.detail?.engine==='browser-speech'),null,{timeout:10000})
  events.push(...await page.evaluate(()=>window.__ugoVoiceRuntimeEvents||[]))
  const fallbackReady=events.some(item=>item.name==='ugo:native-voice-state'&&item.detail?.engine==='browser-speech'&&['device-fallback','gemini-live-start-fallback','gemini-live-fallback'].includes(item.detail?.reason))
  const final=events.find(item=>item.name==='ugo:native-voice-result'&&item.detail?.engine==='browser-speech'&&item.detail?.final===true)
  assert.equal(fallbackReady,true,role+' must enter browser-speech fallback')
  assert.equal(final?.detail?.text,'necesito un plomero',role+' must emit final browser transcript')
  await page.evaluate(()=>window.UGOVoiceBridge.stopListening())
  results.push({role,status:'PASS',fallback:'browser-speech',transcript:final.detail.text})
  await page.close()
 }
}finally{await browser.close()}

const evidence={task:'hugo-voice-browser-runtime',sha,environment:'LOCAL_BROWSER_EXACT_SHA',production_touched:false,result:'PASS',roles:results,completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/hugo-voice-browser-runtime.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
