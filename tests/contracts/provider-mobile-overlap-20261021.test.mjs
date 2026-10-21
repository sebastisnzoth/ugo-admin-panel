import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root=fs.readFileSync('src/mvp/provider/ProviderRoot.tsx','utf8')
const css=fs.readFileSync('src/mvp/provider/provider-production-shell.css','utf8')
const header=root.slice(root.indexOf('<header className="provider-client-topbar">'),root.indexOf('</header><div id="ugo-main-content"'))

test('provider notification bell lives inside header actions, not floating over language',()=>{
 assert.ok(header.includes('provider-client-topbar-main'))
 assert.ok(header.includes('provider-client-topbar-actions'))
 assert.ok(header.includes('<NotificationCenter role="provider"'))
 assert.ok(header.includes('provider-client-topbar-language'))
 assert.ok(header.indexOf('provider-client-topbar-actions')<header.indexOf('<NotificationCenter'))
 assert.ok(header.indexOf('<NotificationCenter')<header.indexOf('provider-client-topbar-language'))
 assert.equal(root.slice(0,root.indexOf('<header className="provider-client-topbar">')).includes('<NotificationCenter role="provider"'),false)
 assert.match(css,/\.provider-client-topbar \.ugo-notification-center\.role-provider\{[\s\S]*?position:relative!important/)
})

test('mobile eliminates redundant floating operational dock without removing its actions',()=>{
 assert.match(root,/className="provider-operational-dock"/)
 assert.match(root,/data-testid="provider-mobile-orders"/)
 assert.match(root,/data-testid="provider-mobile-work"/)
 assert.match(css,/@media\(max-width:999px\)\{[\s\S]*?\.ugo-provider-root \.provider-operational-dock\{\s*display:none!important/)
})

test('mobile dispute launcher is in flow and bottom nav has touch targets and safe padding',()=>{
 assert.match(css,/@media\(max-width:999px\)\{[\s\S]*?\.ugo-provider-root \.ugo-dispute-launch\{[\s\S]*?position:relative!important/)
 assert.match(css,/margin:0 auto calc\(108px \+ env\(safe-area-inset-bottom\)\)!important/)
 assert.match(css,/\.ugo-provider-root \.provider-bottom-nav button\{\s*min-width:0;\s*min-height:48px!important/)
 assert.match(css,/padding-bottom:calc\(120px \+ env\(safe-area-inset-bottom\)\)!important/)
})

test('mobile language selector is in its own full-width header row',()=>{
 assert.match(header,/<div className="provider-client-topbar-language"><LanguageSelector\/><\/div>/)
 assert.match(css,/\.ugo-provider-root \.provider-client-topbar-language \.ugo-language-inline\{\s*display:grid;/)
})
