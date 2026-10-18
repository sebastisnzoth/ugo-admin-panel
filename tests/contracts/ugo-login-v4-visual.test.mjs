import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../../src/mvp/ugo-login-v3.css', import.meta.url), 'utf8')
const app = readFileSync(new URL('../../src/mvp/MvpApp.tsx', import.meta.url), 'utf8')
const admin = readFileSync(new URL('../../src/mvp/AdminGate.tsx', import.meta.url), 'utf8')

test('approved V4 login treatment targets all four auth-only shells', () => {
  for (const selector of ['.mvp-auth-page.role-client .mvp-auth-intro', '.mvp-auth-page.role-provider .mvp-auth-intro', '.mvp-auth-page.ugo-admin-auth .ugo-admin-auth-intro', '.mvp-auth-page.ugo-superadmin-auth .ugo-admin-auth-intro']) {
    assert.ok(css.includes(selector), 'Missing login V4 selector: ' + selector)
  }
  assert.match(css, /background-size:cover/)
  assert.match(css, /@media\(max-width:600px\)/)
  assert.match(css, /@media\(orientation:landscape\)/)
  assert.match(css, /prefers-reduced-motion:reduce/)
})

test('V4 is a visual layer wired after existing auth styling, not a second login engine', () => {
  assert.ok(app.indexOf("import'./ugo-login-v3.css'") > app.indexOf("import'./ugo-auth-redesign.css'"))
  assert.match(admin, /supabase\.auth\.signInWithPassword/)
  assert.match(admin, /authorizeSession/)
  assert.match(admin, /requiresSuperAdmin/)
  assert.match(admin, /t\('adminAuth\.adminOnly'\)/)
})
