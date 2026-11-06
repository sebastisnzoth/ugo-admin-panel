import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const ui=readFileSync('src/mvp/provider/ProviderPortfolioAvailability.tsx','utf8')
const client=readFileSync('src/features/client/order/AssignedProviderCard.tsx','utf8')
test('portfolio previews an allowed file before publishing to the existing provider folder',()=>{
 assert.match(ui,/file\.size<=0\|\|file\.size>5\*1024\*1024/)
 assert.match(ui,/URL\.createObjectURL\(photo\)/)
 assert.match(ui,/URL\.revokeObjectURL\(url\)/)
 assert.match(ui,/onClick=\{\(\)=>void upload\(photo\)\}/)
 assert.match(ui,/\$\{userId\}\/portfolio\/\$\{name\}/)
 assert.match(client,/\$\{providerId\}\/portfolio/)
 assert.match(ui,/providerPortfolioUx\.privacy/)
})
test('portfolio distinguishes loading, error and empty states',()=>{
 assert.match(ui,/portfolioLoading\?/)
 assert.match(ui,/portfolioError\?/)
 assert.match(ui,/providerPortfolioUx\.empty/)
 assert.match(ui,/retryPortfolio/)
})
