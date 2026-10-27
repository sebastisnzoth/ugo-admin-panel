import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const migration=readFileSync('supabase/migrations/20261027183000_autonomous_evidence_insert_hash_guard.sql','utf8')

test('new evidence is hashed on INSERT without replacing supplied hashes',()=>{
  assert.match(migration,/before insert on public\.autonomous_evidence_ledger/i)
  assert.match(migration,/if new\.evidence_hash is null or btrim\(new\.evidence_hash\) = '' then/i)
  assert.match(migration,/sha256\(/i)
  assert.match(migration,/generated_at_insert_v1/)
})
test('append-only protections remain and historical rows are not rewritten',()=>{
  assert.doesNotMatch(migration,/\bupdate\s+public\.autonomous_evidence_ledger\b/i)
  assert.doesNotMatch(migration,/\bdelete\s+from\s+public\.autonomous_evidence_ledger\b/i)
  assert.doesNotMatch(migration,/\bdisable\s+trigger\b/i)
  assert.doesNotMatch(migration,/\balter\s+table\s+public\.autonomous_evidence_ledger\s+disable\b/i)
})
