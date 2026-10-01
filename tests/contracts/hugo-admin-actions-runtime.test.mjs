import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('Admin Hugo exposes only bounded read/navigation tools',async()=>{const orb=await read('src/components/ConversationalOrb.tsx'),live=await read('src/lib/browserVoiceBridge.ts');for(const token of['admin_get_operational_summary','admin_find_service','admin_find_user','admin_navigate','admin_open_service','admin_refresh','UNKNOWN_TOOL','ADMIN_NAV_TARGETS'])assert.ok(orb.includes(token),token);for(const forbidden of['admin_set_service_status','admin_set_payment','admin_approve_kyc','admin_resolve_dispute'])assert.ok(!live.includes(`name:'${forbidden}'`),forbidden)})
test('Admin Hugo live instruction forbids dangerous voice mutations',async()=>{const live=await read('src/lib/browserVoiceBridge.ts');assert.match(live,/No modifiques estados, dinero, usuarios, KYC, disputas ni configuración por voz/)})
