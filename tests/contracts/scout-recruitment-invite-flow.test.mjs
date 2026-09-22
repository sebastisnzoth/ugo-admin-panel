import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider recruitment invitation is routed before normal provider auth',async()=>{
 const app=await read('src/mvp/MvpApp.tsx')
 const router=await read('src/app/router.ts')
 assert.match(router,/if\(app==='recruit'\)return'recruit'/)
 assert.match(app,/ProviderRecruitmentLanding/)
 assert.match(app,/if\(route==='recruit'\)return/)
})

test('recruitment landing validates invite, creates provider account and continues into document onboarding',async()=>{
 const src=await read('src/mvp/ProviderRecruitmentLanding.tsx')
 assert.match(src,/scout_public_invitation/)
 assert.match(src,/scout_claim_invitation/)
 assert.match(src,/tipo:'proveedor'/)
 assert.match(src,/ProviderOnboardingGate/)
 assert.match(src,/Subí documentos/)
})

test('growth migration contains campaign, timeline, invite, dedupe and conversion primitives',async()=>{
 const sql=await read('supabase/migrations/20260921230000_scout_recruitment_growth_engine.sql')
 assert.match(sql,/create table if not exists public\.scout_campaigns/)
 assert.match(sql,/create table if not exists public\.scout_contact_events/)
 assert.match(sql,/admin_scout_upsert_candidates/)
 assert.match(sql,/admin_issue_scout_invitation/)
 assert.match(sql,/scout_public_invitation/)
 assert.match(sql,/scout_claim_invitation/)
 assert.match(sql,/sync_scout_provider_onboarding/)
 assert.match(sql,/scout_duplicate_groups/)
 assert.match(sql,/scout_campaign_metrics/)
})
