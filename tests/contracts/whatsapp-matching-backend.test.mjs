import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/20260915085000_whatsapp_matching_backend.sql';
const whatsappPath = 'api/whatsapp/send.js';

test('WhatsApp matching uses the canonical engine through a service-role-only bridge', async () => {
  const [migration, whatsapp] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(whatsappPath, 'utf8'),
  ]);

  assert.match(whatsapp, /rpc\('iniciar_matching_backend'/);
  assert.match(migration, /create or replace function public\.iniciar_matching_backend\(p_servicio_id uuid\)/i);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /metadata->>'source'/);
  assert.match(migration, /v_source <> 'whatsapp'/);
  assert.match(migration, /set_config\('request\.jwt\.claim\.sub', v_cliente_id::text, true\)/);
  assert.match(migration, /private\.iniciar_matching_impl\(p_servicio_id\)/);
  assert.match(migration, /revoke all on function public\.iniciar_matching_backend\(uuid\) from anon/i);
  assert.match(migration, /revoke all on function public\.iniciar_matching_backend\(uuid\) from authenticated/i);
  assert.match(migration, /grant execute on function public\.iniciar_matching_backend\(uuid\) to service_role/i);
});

test('WhatsApp bridge does not duplicate provider matching SQL', async () => {
  const migration = await readFile(migrationPath, 'utf8');
  assert.doesNotMatch(migration, /insert\s+into\s+public\.ofertas_servicio/i);
  assert.doesNotMatch(migration, /from\s+public\.perfiles_proveedor/i);
});
