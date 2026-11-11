import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const css=readFileSync(new URL('../../src/mvp/client-login-polish.css',import.meta.url),'utf8')
const shared=readFileSync(new URL('../../src/mvp/shared.tsx',import.meta.url),'utf8')
const app=readFileSync(new URL('../../src/mvp/MvpApp.tsx',import.meta.url),'utf8')

test('client login omits the decorative orb that provider uses',()=>{
 assert.match(shared,/role!=='client'&&<div className="mvp-mini-orb"/)
})

test('mobile client heading occupies the whole grid row, not an empty 36px orb column',()=>{
 const mobile=css.slice(css.indexOf('@media(max-width:820px)'))
 assert.match(mobile,/\.mvp-auth-card-head\{grid-template-columns:minmax\(0,1fr\)!important;gap:0!important;width:100%;min-width:0\}/)
 assert.match(mobile,/\.mvp-auth-card-head>div\{width:100%;min-width:0\}/)
 assert.match(mobile,/\.mvp-auth-card-head h1\{max-width:100%;overflow-wrap:normal;text-wrap:balance\}/)
})

test('client-only overrides load after shared login styles and do not affect provider',()=>{
 assert.ok(app.indexOf("import'./client-login-polish.css'")>app.indexOf("import'./ugo-login-v3.css'"))
 assert.doesNotMatch(css,/\.mvp-auth-page\.role-provider/)
})

test('phone hero is compact and header remains readable',()=>{
 assert.match(css,/@media\(max-width:600px\)\{/)
 assert.match(css,/\.mvp-auth-intro\{\s*min-height:0!important/)
 assert.match(css,/\.mvp-auth-card-head p\{\s*font-size:14px;line-height:1\.5/)
})
