import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Admin browser QA initializes the TEST session before navigation and waits for the actual UI', async()=>{
 const source=await readFile(new URL('../../scripts/readiness-admin-responsive-runtime.mjs',import.meta.url),'utf8')
 assert.match(source,/page\.addInitScript\(session=>localStorage\.setItem\('ugo-test-admin-auth',JSON\.stringify\(session\)\),login\.session\)/)
 assert.match(source,/page\.goto\(base\+'\/\?app=admin',\{waitUntil:'domcontentloaded'\}\)/)
 assert.match(source,/\.ugo-admin2'\)\.waitFor\(\{state:'visible',timeout:30000\}\)/)
 assert.doesNotMatch(source,/waitUntil:'networkidle'/)
 assert.match(source,/const matrix=\[/)
 for(const width of [320,360,390,430,768,1024,1440])assert.match(source,new RegExp('width:'+width+'[,}]'))
 assert.match(source,/shellMetrics\(page,vp\.id\+':'\+nav\)/)
 assert.match(source,/PRIMARY_NAV_TOUCH_TARGET_TOO_SMALL/)
 assert.match(source,/RESPONSIVE_BROWSER_PAGE_ERRORS/)
})

test('Admin Judge independently requires the seven viewports, real navigation and screenshots',async()=>{
 const judge=await readFile(new URL('../../scripts/readiness-admin-responsive-judge.mjs',import.meta.url),'utf8')
 assert.match(judge,/JUDGE_VIEWPORT_MATRIX_REQUIRED/)
 assert.match(judge,/JUDGE_VIEWPORT_WIDTHS/)
 assert.match(judge,/\['mobile-320','mobile-360','mobile-390','mobile-430','tablet-768','tablet-1024','desktop-1440'\]/)
 assert.match(judge,/JUDGE_SECTION_COVERAGE/)
 assert.match(judge,/JUDGE_DOCUMENT_OVERFLOW/)
 assert.match(judge,/JUDGE_SHELL_OVERFLOW/)
 assert.match(judge,/fs\.access\('artifacts\/'\+shot\)/)
})

test('Super Admin navigation retains role gate and uses a locale-independent browser locator',async()=>{
 const [admin,runtime]=await Promise.all([
  readFile(new URL('../../src/mvp/AdminPhase2.tsx',import.meta.url),'utf8'),
  readFile(new URL('../../scripts/readiness-admin-responsive-runtime.mjs',import.meta.url),'utf8')
 ])
 assert.match(admin,/isSuperAdmin&&<button data-testid="admin-superadmin-nav"/)
 assert.match(runtime,/if\(profile\.tipo==='superadmin'\)/)
 assert.match(runtime,/page\.getByTestId\('admin-superadmin-nav'\)/)
 assert.match(runtime,/superAdminButton\.waitFor\(\{state:'visible',timeout:20000\}\)/)
})

test('Admin TEST auth failures keep a sanitized artifact and never silently pass',async()=>{
 const source=await readFile(new URL('../../scripts/readiness-admin-responsive-runtime.mjs',import.meta.url),'utf8')
 assert.match(source,/admin-responsive-auth-diagnostic\.json/)
 assert.match(source,/if\(loginError\)/)
 assert.match(source,/assert\.ifError\(loginError\)/)
 assert.match(source,/retryable:loginError\.name==='AuthRetryableFetchError'/)
})
