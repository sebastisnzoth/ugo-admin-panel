import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('canonical autonomous roster keeps 118 cataloged with legacy D14 auditor disabled',async()=>{
 const sql=await read('supabase/migrations/20261002130000_canonical_117_active_agent_roster.sql')
 assert.match(sql,/total_agents<>118/)
 assert.match(sql,/enabled_agents<>117/)
 assert.match(sql,/agent_key='corporate-audit-agent'/)
 assert.match(sql,/status='DISABLED'/)
 assert.match(sql,/action_caps<>117/)
})

test('Sentinel permits scoped containment but blocks GLOBAL kill switches',async()=>{
 const src=await read('scripts/autonomous-sentinel-gate.mjs')
 assert.match(src,/scope_type','GLOBAL/)
 assert.match(src,/SENTINEL_GLOBAL_KILL_SWITCHES/)
 assert.match(src,/activeScopedKillSwitches/)
 assert.doesNotMatch(src,/SENTINEL_ACTIVE_KILL_SWITCHES/)
})


test('Sentinel allows ON only behind a READY AUTONOMY_ON gate',async()=>{
 const src=await read('scripts/autonomous-sentinel-gate.mjs')
 assert.match(src,/\['OFF','ON'\]\.includes\(state\.mode\)/)
 assert.match(src,/gate_key','AUTONOMY_ON/)
 assert.match(src,/gate\.status!=='READY'/)
 assert.match(src,/SENTINEL_AUTONOMY_ON_WITHOUT_READY_GATE/)
})
