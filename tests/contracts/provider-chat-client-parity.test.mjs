import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const css=readFileSync(new URL('../../src/mvp/service-chat.css',import.meta.url),'utf8')
const chat=readFileSync(new URL('../../src/mvp/ServiceChat.tsx',import.meta.url),'utf8')
const provider=readFileSync(new URL('../../src/mvp/provider/ProviderActiveJob.tsx',import.meta.url),'utf8')
function rule(selector){
  const start=css.indexOf(selector+'{')
  assert.ok(start>=0,'missing style '+selector)
  const end=css.indexOf('}',start)
  return css.slice(start,end)
}
test('Provider keeps shared ServiceChat role, quick reply send and realtime handlers',()=>{
 assert.match(provider,/<ServiceChat role="provider" serviceId=\{s\.id\} compact\/>/)
 assert.match(chat,/quickReplies=normalizedRole==='client'/)
 assert.match(chat,/void sendText\(reply,'quick_reply'\)/)
 assert.match(chat,/sb\.from\('mensajes'\)\.insert/)
 assert.match(chat,/postgres_changes/)
})
test('Provider has Client-like one-row scrollable quick reply pills',()=>{
 const row=rule('.ugo-provider-root .ugo-service-chat.compact .ugo-service-chat-quick>div')
 assert.match(row,/display:flex!important/)
 assert.match(row,/flex-wrap:nowrap!important/)
 assert.match(row,/overflow-x:auto!important/)
 const pill=rule('.ugo-provider-root .ugo-service-chat.compact .ugo-service-chat-quick button')
 assert.match(pill,/border-radius:999px!important/)
 assert.match(pill,/white-space:nowrap!important/)
 assert.match(pill,/min-height:44px!important/)
})
test('Provider has light message bubbles, mobile composer and keyboard focus',()=>{
 assert.match(rule('.ugo-provider-root .ugo-service-chat.compact'),/background:#fff!important/)
 assert.match(rule('.ugo-provider-root .ugo-service-chat.compact .ugo-service-chat-list article.is-own'),/background:#e8f8f0!important/)
 assert.match(rule('.ugo-provider-root .ugo-service-chat.compact .ugo-service-chat-form'),/grid-template-columns:minmax\(0,1fr\) auto/)
 assert.match(rule('.ugo-provider-root .ugo-service-chat.compact .ugo-service-chat-form textarea'),/font-size:16px/)
 assert.match(css,/@media\(max-width:360px\)/)
 assert.match(css,/\.ugo-provider-root \.ugo-service-chat\.compact :is\(button,textarea,select\):focus-visible/)
})
