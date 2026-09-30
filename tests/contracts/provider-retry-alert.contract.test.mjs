import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client retry refreshes live provider offer cycle so provider is alerted again',async()=>{
 const [migration,alertMigration,detail,actions]=await Promise.all([
  read('supabase/migrations/20260926054000_retry_matching_realerts_provider.sql'),
  read('supabase/migrations/20260925165000_provider_offer_alert_reactivation.sql'),
  read('src/features/client/order/ClientServiceDetail.tsx'),
  read('src/features/client/services/clientActionService.ts'),
 ])
 assert.match(detail,/retryOwnedClientMatching\(supabase,user\.id,service\.id\)/)
 assert.match(actions,/rpc\('iniciar_matching',\{p_servicio_id:owned\.id\}\)/)
 assert.match(migration,/if v_live_count>0 then[\s\S]*update public\.ofertas_servicio[\s\S]*set expira_at=now\(\)\+interval '5 minutes'/)
 assert.match(migration,/where servicio_id=p_servicio_id[\s\S]*and estado='pendiente'[\s\S]*expira_at is null or expira_at>now\(\)/)
 assert.match(alertMigration,/old\.expira_at is not distinct from new\.expira_at/)
 assert.match(alertMigration,/after insert or update of estado,expira_at on public\.ofertas_servicio/)
 assert.match(alertMigration,/'nueva_oferta'/)
})
