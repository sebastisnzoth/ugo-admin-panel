import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const admin=readFileSync('src/mvp/AdminPhase2.tsx','utf8')
const fixtures=readFileSync('scripts/role-ui-fixtures.mjs','utf8')

test('admin modules fail locally without removing the administrative shell',()=>{
 assert.match(admin,/import\{SentinelErrorBoundary\}/)
 assert.match(admin,/nativeWrap=.*SentinelErrorBoundary role="admin" action="admin\.module\.render"/)
 assert.match(admin,/SentinelErrorBoundary role="admin" action="admin\.superadmin\.render"[\s\S]*SuperAdminCommandCenter/)
})

test('Auth fixture creation recovers committed users before a bounded retry',()=>{
 assert.match(fixtures,/createConfirmedAuthUser/)
 assert.match(fixtures,/attempt<=3/)
 assert.match(fixtures,/signInWithPassword\(\{email,password\}\)/)
 assert.match(fixtures,/login\.data\.user[\s\S]*return\{data:\{user:login\.data\.user\},error:null\}/)
 assert.match(fixtures,/const created=await createConfirmedAuthUser\(db,\{email,password,role\}\)/)
 assert.doesNotMatch(fixtures,/if\(!created\.error&&created\.data\.user\)return created[\s\S]*if\(!created\.error&&created\.data\.user\)return created/)
})
