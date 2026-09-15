import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const config=fs.readFileSync('capacitor.config.json','utf8')
const workflow=fs.readFileSync('.github/workflows/android-test-apk.yml','utf8')
const runtime=fs.readFileSync('src/lib/apiRuntime.ts','utf8')
const main=fs.readFileSync('src/main.tsx','utf8')

test('Android TEST packages the current web bundle instead of loading Vercel remotely',()=>{
 const parsed=JSON.parse(config)
 assert.equal(parsed.webDir,'dist')
 assert.equal(parsed.server?.url,undefined)
 assert.equal(parsed.plugins?.CapacitorHttp?.enabled,true)
 assert.doesNotMatch(config,/vercel\.app/i)
 assert.doesNotMatch(workflow,/remoteRuntime=.*vercel/i)
 assert.match(workflow,/bundleRuntime=local-dist/)
})

test('Android TEST stamps the exact main revision and explicit TEST API base',()=>{
 assert.match(workflow,/VITE_APP_REVISION: \$\{\{ github\.sha \}\}/)
 assert.match(workflow,/VITE_API_BASE_URL: \$\{\{ env\.UGO_ANDROID_API_BASE \}\}/)
 assert.match(workflow,/UGO_ANDROID_API_BASE: https:\/\/ugo-admin-panel-netlify\.netlify\.app/)
 assert.match(workflow,/grep -R -q "\$\{GITHUB_SHA\}" android\/app\/src\/main\/assets\/public/)
 assert.match(workflow,/apiTransport=CapacitorHttp-native/)
})

test('mobile API routing rewrites only same-app API requests and is installed before Sentinel',()=>{
 assert.match(runtime,/input\.startsWith\('\/api\/'\)/)
 assert.match(runtime,/url\.origin===window\.location\.origin&&url\.pathname\.startsWith\('\/api\/'\)/)
 assert.match(runtime,/VITE_API_BASE_URL/)
 assert.match(main,/installApiRuntimeBase\(\)\s*\ninstallSentinel\(\)/)
})
