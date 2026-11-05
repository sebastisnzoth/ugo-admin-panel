import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const screen=readFileSync('src/features/client/request/ClientPostConfirmFlow.tsx','utf8')
const css=readFileSync('src/features/client/request/client-post-confirm.css','utf8')
test('matching actions have clear hierarchy without changing service actions',()=>{
 assert.match(screen,/ugo-match-continue.*onClick=\{continueBackground\}/)
 assert.match(screen,/restartMatching\(service\.id,true\)/)
 assert.match(screen,/onClick=\{\(\)=>void cancel\(\)\}/)
 assert.match(screen,/clientJourney\.matchRecovery/)
 assert.match(screen,/aria-label=\{t\('clientJourney\.matchProgress'\)\}/)
 assert.match(css,/ugo-match-continue\{width:100%;max-width:430px/)
 assert.match(css,/ugo-match-recovery\{box-sizing:border-box/)
 assert.match(css,/button:focus-visible/)
})
