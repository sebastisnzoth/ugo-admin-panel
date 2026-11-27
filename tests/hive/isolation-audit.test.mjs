import test from 'node:test'
import assert from 'node:assert/strict'
import { scanSource, auditRepository, RULE, HIVE_CLIENT_ALLOWLIST, BOOT_FILES } from '../../scripts/hive/isolation-audit.mjs'

const REVIEWED = HIVE_CLIENT_ALLOWLIST[0]

test('Arena boot files must never reference Hive', () => {
  for (const boot of BOOT_FILES) {
    const rules = scanSource(boot, `fetch('https://ugo-hive-freeapi.onrender.com/api/ping')`).map(f => f.rule)
    assert.ok(rules.includes(RULE.BOOT), `${boot} must be flagged`)
  }
})

test('a Hive network call without a bounded abort is a violation', () => {
  const rules = scanSource(REVIEWED, `await supabase.functions.invoke<HiveStatus>('ugo-hive-status',{method:'GET'})`).map(f => f.rule)
  assert.ok(rules.includes(RULE.UNBOUNDED))
})

test('a Hive network call with a bounded abort passes the reviewed module', () => {
  const guarded = `const c=new AbortController();const t=setTimeout(()=>c.abort(),1);
    await supabase.functions.invoke<HiveStatus>('ugo-hive-status',{method:'GET',signal:c.signal})`
  assert.deepEqual(scanSource(REVIEWED, guarded), [])
  const native = `await supabase.functions.invoke('ugo-hive-status',{signal:AbortSignal.timeout(8000)})`
  assert.deepEqual(scanSource(REVIEWED, native), [])
})

test('interval driven Hive activity is rejected as aggressive polling', () => {
  const rules = scanSource(REVIEWED, `setInterval(()=>supabase.functions.invoke('ugo-hive-status',{signal:AbortSignal.timeout(1000)}),50)`).map(f => f.rule)
  assert.ok(rules.includes(RULE.POLLING))
})

test('Hive references outside the reviewed module are violations even without a network call', () => {
  const rules = scanSource('src/features/client/ClientHome.tsx', `const url='https://ugo-hive-freeapi.onrender.com/api/ping'`).map(f => f.rule)
  assert.ok(rules.includes(RULE.UNREVIEWED))
})

test('privileged credential names are rejected anywhere in runtime code', () => {
  for (const source of [
    `const key=import.meta.env.SUPABASE_SERVICE_ROLE_KEY`,
    `const k='OPENROUTER_API_KEY'`,
    `const t=import.meta.env.FREEAPI_HIVE_TOKEN`,
  ]) {
    const rules = scanSource('src/lib/supabase.ts', source).map(f => f.rule)
    assert.ok(rules.includes(RULE.SECRET), source)
  }
})

test('Arena code with no Hive mention produces no findings', () => {
  assert.deepEqual(scanSource('src/features/client/ClientHome.tsx', `export const ClientHome=()=><div/>`), [])
})

test('the checked-in Arena tree satisfies the isolation gate', () => {
  const evidence = auditRepository(process.cwd(), new Date('2026-11-27T00:00:00.000Z'))
  assert.equal(evidence.verdict, 'PASS', JSON.stringify(evidence.findings, null, 2))
  assert.equal(evidence.check, 'HIVE_ARENA_ISOLATION_STATIC')
  assert.ok(evidence.scanned_files > 100, 'scan must cover the real runtime tree')
  assert.deepEqual(evidence.boot_files_scanned, [...BOOT_FILES])
  assert.ok(evidence.hive_referencing_files.includes('src/mvp/HiveConsole.tsx'))
  for (const file of evidence.hive_referencing_files) {
    assert.ok(HIVE_CLIENT_ALLOWLIST.includes(file), `${file} must be reviewed before it may reference Hive`)
  }
})
