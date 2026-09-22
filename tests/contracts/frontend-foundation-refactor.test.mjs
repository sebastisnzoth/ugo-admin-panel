import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('frontend foundation exposes canonical design tokens and reusable UI primitives',async()=>{
 const main=await read('src/main.tsx')
 const tokens=await read('src/styles/tokens.css')
 const ui=await read('src/shared/ui/index.tsx')
 assert.match(main,/styles\/tokens\.css/)
 assert.match(main,/shared\/ui\/ui\.css/)
 assert.match(tokens,/--ugo-color-brand-500/)
 assert.match(tokens,/--ugo-space-4/)
 assert.match(tokens,/--ugo-radius-md/)
 for(const name of ['Button','Input','Select','Textarea','Card','Modal','Badge','TabList','SectionHeader','EmptyState','LoadingState','StatusPill'])assert.match(ui,new RegExp(name))
})

test('app route selection is centralized in app/router',async()=>{
 const app=await read('src/mvp/MvpApp.tsx')
 const router=await read('src/app/router.ts')
 assert.match(app,/resolveAppRoute/)
 assert.match(router,/export function resolveAppRoute/)
 assert.match(router,/app==='admin'/)
 assert.match(router,/app==='provider'/)
 assert.match(router,/app==='client'/)
 assert.match(router,/app==='recruit'/)
})

test('runtime boundary is extracted from main bootstrap',async()=>{
 const main=await read('src/main.tsx')
 const boundary=await read('src/app/AppErrorBoundary.tsx')
 assert.match(main,/AppErrorBoundary/)
 assert.match(main,/EnvironmentBadge/)
 assert.doesNotMatch(main,/class AppErrorBoundary/)
 assert.match(boundary,/reportSentinelIncident/)
 assert.match(boundary,/shared\/ui/)
})

test('Scout CRM has a feature model and Supabase service layer',async()=>{
 const crm=await read('src/components/ScoutCRM.tsx')
 const service=await read('src/features/scout/services/scoutCrmService.ts')
 const model=await read('src/features/scout/model.ts')
 assert.match(crm,/loadScoutCrmDashboard/)
 assert.match(crm,/createScoutCampaign/)
 assert.match(crm,/bulkUpdateScoutProspects/)
 assert.match(service,/from\('prospectos_scouts'\)/)
 assert.match(service,/scout_campaign_metrics/)
 assert.match(model,/export type Prospect/)
 assert.doesNotMatch(crm,/const selectFields=/)
})
