import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql = readFileSync(new URL('../../supabase/migrations/20261021223000_safe_automatic_rematch_recovery.sql', import.meta.url), 'utf8');
test('rematch includes searching and offered but no terminal states', () => {
 assert.match(sql, /s\.estado IN \('buscando', 'ofrecido'\)/);
 assert.match(sql, /s\.proveedor_id IS NULL/);
 assert.match(sql, /matching_expires_at IS NULL OR s\.matching_expires_at <= now\(\)/);
});
test('retry skips live offers, limits work and serializes cancellation', () => {
 assert.match(sql, /o\.estado = 'pendiente'/);
 assert.match(sql, /o\.expira_at IS NULL OR o\.expira_at > now\(\)/);
 assert.match(sql, /LIMIT 20\s+FOR UPDATE OF s SKIP LOCKED/);
 assert.match(sql, /expira_at <= now\(\)/);
});
test('retry delegates security and does not auto enable cron', () => {
 assert.match(sql, /private\.iniciar_matching_impl\(r\.id\)/);
 assert.doesNotMatch(sql, /cron\.(schedule|alter_job|unschedule)\s*\(/i);
 assert.match(sql, /coalesce\(v_old_sub/);
});
