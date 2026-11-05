import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(p,'utf8')
const home=read('src/mvp/provider/ProviderHome.tsx')
const earnings=read('src/mvp/provider/ProviderEarnings.tsx')
const payout=read('src/mvp/ProviderPayoutPanel.tsx')
test('released totals are labelled separately from the withdrawable balance',()=>{
 assert.match(home,/providerEarnings\.releasedExplanation/)
 assert.match(earnings,/providerEarnings\.releasedExplanation/)
 assert.match(payout,/formatMoney\(balance\.saldo_disponible\)/)
})
test('payout balance has a loading and retry state and prevents stale withdrawals',()=>{
 assert.match(payout,/useState<Balance\|null>\(null\)/)
 assert.match(payout,/providerPayout\.loadingBalance/)
 assert.match(payout,/providerPayout\.balanceUnavailable/)
 assert.match(payout,/if\(!balance\|\|balanceError\)return/)
 assert.match(payout,/disabled=\{busy\|\|balanceError\|\|!balance/)
})
