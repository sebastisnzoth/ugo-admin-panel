// Select an explicitly configured Supabase project for browser access.
// Publishable keys are safe for browsers; never put secret/service-role keys here.
const TEST_REF = 'tmossnqfwfwjrtzwcbmm'
const PROD_REF = 'trfsjuseqjxlhrxuvdsm'
const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
const configuredRef = configuredUrl?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/)?.[1]

if (configuredUrl && !configuredRef) throw new Error('UGO: invalid VITE_SUPABASE_URL')
if ((configuredUrl && !configuredKey) || (!configuredUrl && configuredKey)) {
  throw new Error('UGO: both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required')
}
if (configuredRef && ![TEST_REF, PROD_REF].includes(configuredRef)) {
  throw new Error('UGO: unknown Supabase project')
}

export const UGO_SUPABASE_PROJECT_REF = configuredRef ?? TEST_REF
export const UGO_SUPABASE_URL = configuredUrl ?? 'https://tmossnqfwfwjrtzwcbmm.supabase.co'
export const UGO_SUPABASE_PUBLISHABLE_KEY = configuredKey ?? 'sb_publishable_meCpkMt79S25M0nHgVv1aQ_V9AMPZEl'
export const UGO_ENVIRONMENT = UGO_SUPABASE_PROJECT_REF === PROD_REF ? 'production' : 'test'
