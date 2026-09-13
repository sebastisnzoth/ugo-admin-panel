import type { VercelRequest,VercelResponse } from '@vercel/node'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const TEST_KEY='sb_publishable_meCpkMt79S25M0nHgVv1aQ_V9AMPZEl'

export default async function handler(req:VercelRequest,res:VercelResponse){
  process.env.SUPABASE_URL=TEST_URL
  process.env.SUPABASE_ANON_KEY=TEST_KEY
  const mod=await import('./test.js')
  return mod.default(req,res)
}
