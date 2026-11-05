import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root=fs.readFileSync('src/mvp/provider/ProviderRoot.tsx','utf8')
const css=fs.readFileSync('src/mvp/provider/provider-production-shell.css','utf8')
const profile=fs.readFileSync('src/mvp/provider/ProviderProfile.tsx','utf8')
const sidebar=fs.readFileSync('src/mvp/provider/ProviderStudioSidebar.tsx','utf8')
const header=root.slice(root.indexOf('<header className="provider-client-topbar">'),root.indexOf('</header><div id="ugo-main-content"'))

test('provider notification bell lives inside header actions, with no language selector in the header',()=>{
 assert.ok(header.includes('provider-client-topbar-main'))
 assert.ok(header.includes('provider-client-topbar-actions'))
 assert.ok(header.includes('<NotificationCenter role="provider"'))
 assert.ok(header.indexOf('provider-client-topbar-actions')<header.indexOf('<NotificationCenter'))
 // Product decision (2026-11-05): the provider language selector lives only in Profile.
 assert.equal(header.includes('LanguageSelector'),false)
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

test('provider language selector lives only in Profile',()=>{
 assert.match(profile,/htmlFor="ugo-provider-profile-language"/)
 assert.match(profile,/<select id="ugo-provider-profile-language" value=\{locale\} onChange=\{e=>setLocale\(e\.target\.value as UgoLocale\)\}/)
 for(const source of [root,sidebar]){assert.equal(source.includes('<LanguageSelector'),false);assert.equal(source.includes('setLocale('),false)}
})
