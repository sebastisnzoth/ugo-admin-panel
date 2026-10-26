import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url = process.env.UGO_TEST_SUPABASE_URL || ''
const key = process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY || ''
assert.equal(url, 'https://tmossnqfwfwjrtzwcbmm.supabase.co', 'UGO_TEST_ONLY')
assert.ok(key, 'UGO_TEST_SERVICE_ROLE_REQUIRED')

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const { data, error } = await db
  .from('autonomous_company_state')
  .select('mode')
  .eq('singleton', true)
  .single()
if (error) throw error
assert.equal(data?.mode, 'OFF', 'AUTONOMY_MUST_REMAIN_OFF')
console.log('UGO_TEST_AUTONOMY_OFF_CONFIRMED')
