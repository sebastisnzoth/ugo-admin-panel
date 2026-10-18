import assert from 'node:assert/strict'
import fs from 'node:fs'

const css=fs.readFileSync('src/mvp/admin-responsive-hardening.css','utf8')
const phase=fs.readFileSync('src/mvp/AdminPhase2.tsx','utf8')

assert.match(phase,/import'\.\/admin-responsive-hardening\.css'/,'Admin responsive hardening must be loaded last in AdminPhase2')
assert.match(css,/Readiness admin-responsive: adaptive tables \+ compact navigation v1/,'responsive readiness marker required')
assert.match(css,/\.ugo-admin2 \.ugo-superadmin \.ugo-admin2-module-card\{[\s\S]*?overflow-x:auto!important/,'Super Admin cards must expose horizontal table overflow')
assert.match(css,/\.ugo-admin2 \.ugo-superadmin \.ugo-admin2-module-card table\{[\s\S]*?min-width:640px/,'mobile Super Admin tables need a readable minimum width')
assert.match(css,/scroll-snap-type:x proximity/,'compact navigation must support horizontal snap')
assert.match(css,/min-height:44px/,'mobile submenu targets must preserve a 44px touch target')
assert.match(css,/max-width:100vw/,'admin shell must cap itself to viewport width')
assert.match(css,/overflow-x:hidden!important/,'mobile shell must prevent document-level horizontal overflow')
console.log(JSON.stringify({status:'PASS',contract:'admin-responsive',checks:8}))

const users=fs.readFileSync('src/mvp/AdminUsersPanel.tsx','utf8')
assert.match(users,/ugo-admin-users-panel/)
assert.match(users,/ugo-admin-user-edit-form/)
assert.match(users,/ugo-admin-user-card/)
assert.match(users,/repeat\(auto-fit,minmax\(min\(100%,220px\),1fr\)\)/)
assert.match(css,/@media\(max-width:760px\)/)
assert.match(css,/\.ugo-admin-user-card \{ grid-template-columns:minmax\(0,1fr\)!important;/)
assert.match(css,/\.ugo-admin-user-edit-form \{ width:calc\(100vw - 20px\)!important;/)

assert.match(users,/ugo-admin-users-toolbar/)
assert.match(users,/ugo-admin-user-actions/)
assert.match(users,/ugo-admin-user-filter/)
assert.match(css,/@media\(max-width:600px\)/)
assert.match(css,/ugo-admin-user-actions \{ display:grid!important;/)
assert.match(css,/ugo-admin-user-card \{ grid-template-columns:minmax\(0,1fr\)!important;/)
