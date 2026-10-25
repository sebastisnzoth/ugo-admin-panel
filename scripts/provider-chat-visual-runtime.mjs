import assert from 'node:assert/strict'
import {readFile,readdir,mkdir} from 'node:fs/promises'
import path from 'node:path'
import {chromium} from 'playwright'

// Built CSS of the exact checked-out SHA, not an independent mock stylesheet.
// This layout-only fixture has no TEST users, network writes or authentication.
const dir=path.resolve('dist/assets')
const cssFiles=(await readdir(dir)).filter(x=>x.endsWith('.css'))
assert.ok(cssFiles.length,'UGO_PROVIDER_CHAT_BUILD_CSS_MISSING')
const css=(await Promise.all(cssFiles.map(f=>readFile(path.join(dir,f),'utf8')))).join('\n')
assert.ok(css.includes('ugo-service-chat-quick'),'UGO_PROVIDER_CHAT_QUICK_CSS_NOT_BUNDLED')
assert.ok(css.includes('ugo-provider-root'),'UGO_PROVIDER_CHAT_SCOPED_CSS_NOT_BUNDLED')
await mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const widths=[320,360,390,430]
try{
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:760},deviceScaleFactor:1})
  const replies=['Estou a caminho.','Cheguei ao local.','Estou na porta.','Vou atrasar alguns minutos.','Preciso de um material para resolver o problema.','O trabalho está pronto.']
  const html=`<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><style>html,body{margin:0;padding:0}.test-stage{width:100%;padding:12px;box-sizing:border-box}</style></head><body><main class="ugo-provider-root"><div class="test-stage"><section class="ugo-service-chat compact"><header><div><small>CHAT DO SERVIÇO</small><h3>SERGIO TABOADA</h3></div><span>2</span></header><div class="ugo-service-chat-list"><article class="is-own"><small>sebastianzothoficial · 22:03</small><p>Estou a caminho.</p></article><article><small>SERGIO TABOADA · 23:10</small><p>Pode entrar.</p></article></div><div class="ugo-service-chat-quick"><small>RESPOSTAS RÁPIDAS</small><div>${replies.map(x=>`<button type="button">${x}</button>`).join('')}</div><p>Por segurança, telefone, WhatsApp, e-mail, redes sociais e links devem permanecer dentro da UGO.</p></div><form class="ugo-service-chat-form"><label><textarea placeholder="Escreva para sergio taboada..." rows="2"></textarea></label><button type="submit" disabled>Enviar</button></form></section></div></main></body></html>`
  await page.setContent(html,{waitUntil:'domcontentloaded'})
  const measurements=await page.evaluate(()=>{
   const root=document.querySelector('.ugo-service-chat')
   const row=document.querySelector('.ugo-service-chat-quick>div')
   const pill=row.querySelector('button')
   const composer=document.querySelector('.ugo-service-chat-form')
   const textarea=composer.querySelector('textarea')
   const submit=composer.querySelector('button')
   const own=document.querySelector('.ugo-service-chat-list article.is-own')
   const style=x=>getComputedStyle(x)
   return {rootBg:style(root).backgroundColor,rootWidth:root.getBoundingClientRect().width,
     screenWidth:document.documentElement.clientWidth,
     docWidth:document.documentElement.scrollWidth,
     rowWrap:style(row).flexWrap,rowOverflow:style(row).overflowX,
     rowScrollWidth:row.scrollWidth,rowClientWidth:row.clientWidth,
     pillRadius:style(pill).borderRadius,pillWhiteSpace:style(pill).whiteSpace,
     pillHeight:pill.getBoundingClientRect().height,
     ownBg:style(own).backgroundColor,
     textareaFont:parseFloat(style(textarea).fontSize),
     textareaRight:textarea.getBoundingClientRect().right,
     sendRight:submit.getBoundingClientRect().right,
     containerRight:root.getBoundingClientRect().right}
  })
  assert.equal(measurements.rootBg,'rgb(255, 255, 255)',`PROVIDER_CHAT_BACKGROUND_${width}`)
  assert.equal(measurements.rowWrap,'nowrap',`PROVIDER_CHAT_REPLY_WRAP_${width}`)
  assert.equal(measurements.rowOverflow,'auto',`PROVIDER_CHAT_REPLY_SCROLL_${width}`)
  assert.ok(measurements.rowScrollWidth>measurements.rowClientWidth,`PROVIDER_CHAT_SCROLL_CONTENT_${width}`)
  assert.ok(measurements.pillRadius==='999px',`PROVIDER_CHAT_PILL_SHAPE_${width}`)
  assert.ok(measurements.pillWhiteSpace==='nowrap',`PROVIDER_CHAT_PILL_NOWRAP_${width}`)
  assert.ok(measurements.pillHeight>=44,`PROVIDER_CHAT_TAP_TARGET_${width}`)
  assert.equal(measurements.ownBg,'rgb(232, 248, 240)',`PROVIDER_CHAT_OWN_BUBBLE_${width}`)
  assert.ok(measurements.textareaFont>=16,`PROVIDER_CHAT_MOBILE_INPUT_FONT_${width}`)
  assert.ok(measurements.docWidth<=width,`PROVIDER_CHAT_DOCUMENT_OVERFLOW_${width}`)
  assert.ok(measurements.sendRight<=measurements.containerRight+1,`PROVIDER_CHAT_COMPOSER_OVERFLOW_${width}`)
  await page.locator('.ugo-service-chat-quick>div').evaluate(x=>{x.scrollLeft=100})
  const scrollLeft=await page.locator('.ugo-service-chat-quick>div').evaluate(x=>x.scrollLeft)
  assert.ok(scrollLeft>0,`PROVIDER_CHAT_QUICK_REPLY_SCROLL_NOT_WORKING_${width}`)
  if(width===390)await page.screenshot({path:'artifacts/role-ui-provider-chat-390.png',fullPage:true})
  console.log('PROVIDER_CHAT_VISUAL_PASS',JSON.stringify({width,measurements,scrollLeft}))
  await page.close()
 }
}finally{await browser.close()}
