import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const probeUrl=new URL('../../scripts/chat-realtime-probe.mjs',import.meta.url)
const probePath=fileURLToPath(probeUrl)

test('chat realtime probe is valid ESM JavaScript',()=>{
 const result=spawnSync(process.execPath,['--check',probePath],{encoding:'utf8'})
 assert.equal(result.status,0,result.stderr||result.stdout)
})

test('chat realtime probe retries transport loss but still requires an observed realtime event',async()=>{
 const src=await readFile(probeUrl,'utf8')
 assert.match(src,/for \(let retry = 0; retry < 2; retry \+= 1\)/)
 assert.match(src,/await subscribe\(channel/)
 assert.match(src,/const event = await signal\.promise/)
 assert.match(src,/primer evento Realtime no observado/)
 assert.match(src,/reintentando con canal y mensaje nuevos/)
 assert.match(src,/signal\.cancel\(\)/)
 assert.match(src,/cancel: \(\) => clearTimeout\(timer\)/)
 assert.doesNotMatch(src,/return row/)
 assert.doesNotMatch(src,/\\n  const \{ data, error \} = await sb/)
})
