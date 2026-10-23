// A readiness lock is historical once DONE. Future CI regressions must
// re-check the real product, never re-open/overwrite the validated lock.
const ID='client-notifications'
export function clientNotificationsReadinessMode(lock,now=Date.now()){
 if(!lock||lock.readiness_id!==ID||lock.task_id!=='readiness-client-notifications'){
  throw new Error('CLIENT_NOTIFICATIONS_LOCK_IDENTITY_INVALID')
 }
 if(lock.status==='IN_PROGRESS'){
  const lease=Date.parse(lock.lease_expires_at||'')
  if(!Number.isFinite(lease)||lease<=now)throw new Error('ACTIVE_LEASE_REQUIRED')
  return 'IN_PROGRESS'
 }
 if(lock.status==='DONE'){
  if(lock.lease_expires_at!==null||
   lock.validators_result?.Judge!=='PASS'||lock.validators_result?.Sentinel!=='PASS'||
   lock.judge!=='PASS'||lock.sentinel!=='PASS'||
   lock.production_touched!==false||
   typeof lock.runtime_validated_sha!=='string'||!lock.runtime_validated_sha||
   typeof lock.evidence_path!=='string'||!lock.evidence_path){
   throw new Error('COMPLETED_READINESS_EVIDENCE_INVALID')
  }
  return 'DONE'
 }
 throw new Error('CLIENT_NOTIFICATIONS_LOCK_STATUS_BLOCKED')
}
