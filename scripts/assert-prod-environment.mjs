import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const config = JSON.parse(read('vercel.json'))
const PROD = 'trfsjuseqjxlhrxuvdsm'
const url = 'https://' + PROD + '.supabase.co'
const key = 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8'
if (config.env?.SUPABASE_URL !== url || config.env?.VITE_SUPABASE_URL !== url ||
    config.env?.SUPABASE_ANON_KEY !== key || config.env?.VITE_SUPABASE_PUBLISHABLE_KEY !== key) {
  throw new Error('UGO PROD: Vercel project config does not match approved target')
}
const client = read('src/lib/supabaseProject.ts')
if (!client.includes(PROD) || !client.includes('VITE_SUPABASE_URL')) throw new Error('UGO PROD: browser target not configurable')
const proxy = read('api/proxy.js')
if (!proxy.includes('process.env.SUPABASE_URL') || !proxy.includes('UGO_PROD_SUPABASE_SERVICE_ROLE_KEY')) {
  throw new Error('UGO PROD: admin bridge not isolated')
}
const operations = read('api/operations.ts')
if (!operations.includes('process.env.SUPABASE_ANON_KEY') || !operations.includes('UGO_PROD_SUPABASE_SERVICE_ROLE_KEY')) {
  throw new Error('UGO PROD: serverless not isolated')
}
console.log('UGO PROD configuration gate OK:', PROD)
