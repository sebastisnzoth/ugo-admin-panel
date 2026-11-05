import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const home=readFileSync('src/mvp/provider/ProviderHome.tsx','utf8')
const job=readFileSync('src/mvp/provider/ProviderActiveJob.tsx','utf8')

test('home prioritizes the active service and shows its actual state',()=>{
 assert.match(home,/const next=d\.service/)
 assert.match(home,/title:activeState\?t\(activeState\)/)
 assert.match(home,/action:flow\.actions\.openActiveJob/)
 assert.match(home,/d\.debtBlocked&&<Card[^\n]*provider-debt-lock[^\n]*onClick=\{flow\.actions\.openEarnings\}/)
})

test('active job presents its existing control before secondary details',()=>{
 assert.ok(job.indexOf('<Card id="provider-primary-control"')<job.indexOf('<ProviderCustomerCard clientId='))
 assert.ok(job.indexOf('<Card id="provider-primary-control"')<job.indexOf('className="provider-card provider-job-summary"'))
 assert.match(job,/aria-current=\{index===progressIndex/)
 assert.match(job,/prefers-reduced-motion: reduce/)
})
