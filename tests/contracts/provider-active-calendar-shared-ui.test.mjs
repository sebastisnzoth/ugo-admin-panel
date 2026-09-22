import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('active provider job uses shared UI and preserves lifecycle controls',async()=>{const s=await read('src/mvp/provider/ProviderActiveJob.tsx');for(const x of ['EmptyState','SectionHeader','Card','Button'])assert.match(s,new RegExp(x));for(const x of ["d.advance('en_camino')","d.advance('llegado')","d.advance('en_progreso')","d.completeService()","d.cancelService(reason)"])assert.ok(s.includes(x));assert.match(s,/ServiceChat role="provider"/);assert.match(s,/ProviderEvidencePanel/)})
test('provider calendar uses shared UI and preserves connect sync disconnect',async()=>{const s=await read('src/mvp/provider/ProviderCalendarIntegration.tsx');for(const x of ['LoadingState','StatusPill','Card','Button'])assert.match(s,new RegExp(x));assert.match(s,/startProviderCalendar/);assert.match(s,/syncProviderCalendar/);assert.match(s,/disconnectProviderCalendar/)})
