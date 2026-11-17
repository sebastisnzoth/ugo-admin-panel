#!/usr/bin/env node
// Fail-closed preflight for isolated AI processes. NO network or database calls.
// Usage: node scripts/hive-isolation-preflight.mjs
const forbiddenProject = 'trfsjuseqjxlhrxuvdsm';
const legacyTest = 'tmossnqfwfwjrtzwcbmm';
const errors = [];
const env = process.env;
const privilegedNames = [
  'SUPABASE_SERVICE_ROLE_KEY', 'UGO_TEST_SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY', 'DATABASE_URL', 'DIRECT_URL', 'POSTGRES_URL',
  'NEON_API_KEY'
];
for (const key of privilegedNames) {
  if (env[key]) errors.push(key + ' must not be passed to isolated Hive agents');
}
for (const [key, value] of Object.entries(env)) {
  if (typeof value !== 'string') continue;
  const upper = key.toUpperCase();
  if (upper.startsWith('UGO_HIVE_') || upper.startsWith('SUPABASE_') ||
      upper.startsWith('UGO_TEST_') || upper.includes('DATABASE')) {
    if (value.includes(forbiddenProject)) errors.push(key + ' points to Arena PROD');
    if (value.includes(legacyTest)) errors.push(key + ' points to unavailable legacy TEST');
  }
}
if (env.UGO_HIVE_ALLOW_PROD_WRITES === 'true' || env.UGO_HIVE_AUTONOMY_ON === 'true')
  errors.push('production writes/autonomy flags are forbidden in isolated mode');
if (env.UGO_HIVE_MODE !== 'isolated')
  errors.push('UGO_HIVE_MODE must be isolated');
if (env.UGO_HIVE_READ_ONLY !== 'true')
  errors.push('UGO_HIVE_READ_ONLY must be true');
if (!env.UGO_HIVE_DATA_DIR || !env.UGO_HIVE_DATA_DIR.startsWith('/'))
  errors.push('UGO_HIVE_DATA_DIR must be an absolute local directory');
if (errors.length) {
  console.error('HIVE_ISOLATION_BLOCKED:', errors.join('; '));
  process.exit(1);
}
console.log('HIVE_ISOLATION_PREFLIGHT_PASS (local env only; runtime isolation not verified)');
