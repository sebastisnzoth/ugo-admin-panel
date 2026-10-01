export type ExecutiveInboxJob={
 id:string
 correlation_id?:string|null
 authority_class?:string|null
 status?:string|null
 created_at?:string|null
 objective?:string|null
 department_id?:number|null
 approval_count?:number|null
 blocked_reason?:string|null
 [key:string]:unknown
}

export type ExecutiveInboxItem=ExecutiveInboxJob&{
 inbox_priority:'P0'|'P1'|'P2'
 inbox_sla_minutes:number
 inbox_age_minutes:number
 inbox_sla_breached:boolean
}

const authorityRank=(authority?:string|null)=>authority==='RED'?0:authority==='YELLOW'?1:2
const statusRank=(status?:string|null)=>status==='BLOCKED'?0:status==='WAITING_APPROVAL'?1:2
const slaForAuthority=(authority?:string|null)=>authority==='RED'?15:authority==='YELLOW'?30:60
const priorityForAuthority=(authority?:string|null):'P0'|'P1'|'P2'=>authority==='RED'?'P0':authority==='YELLOW'?'P1':'P2'
const timestamp=(value?:string|null)=>{const n=value?Date.parse(value):0;return Number.isFinite(n)?n:0}

export function requiresHumanApproval(job:ExecutiveInboxJob){return job.status==='WAITING_APPROVAL'&&(job.authority_class==='YELLOW'||job.authority_class==='RED')}
export function isGreenApprovalInconsistency(job:ExecutiveInboxJob){return job.status==='WAITING_APPROVAL'&&job.authority_class==='GREEN'}
export function findAutonomyInconsistencies(jobs:ExecutiveInboxJob[]){return jobs.filter(isGreenApprovalInconsistency)}

export function buildExecutiveInboxItems(jobs:ExecutiveInboxJob[],nowMs=Date.now()):ExecutiveInboxItem[]{
 const newestByWork=new Map<string,ExecutiveInboxJob>()
 for(const job of jobs){
  if(job.status!=='WAITING_APPROVAL'&&job.status!=='BLOCKED')continue
  if(job.status==='WAITING_APPROVAL'&&!requiresHumanApproval(job))continue
  const key=String(job.correlation_id||job.id)
  const current=newestByWork.get(key)
  const incomingTimestamp=timestamp(job.created_at)
  const currentTimestamp=timestamp(current?.created_at)
  const incomingId=String(job.id)
  const currentId=String(current?.id||'')
  if(!current||incomingTimestamp>currentTimestamp||(incomingTimestamp===currentTimestamp&&incomingId.localeCompare(currentId)>0))newestByWork.set(key,job)
 }
 return [...newestByWork.values()].map(job=>{
  const sla=inboxSlaMinutes(job.authority_class)
  const age=Math.max(0,Math.floor((nowMs-timestamp(job.created_at))/60000))
  return {...job,inbox_priority:priorityForAuthority(job.authority_class),inbox_sla_minutes:sla,inbox_age_minutes:age,inbox_sla_breached:age>=sla}
 }).sort((a,b)=>
  Number(b.inbox_sla_breached)-Number(a.inbox_sla_breached)||
  authorityRank(a.authority_class)-authorityRank(b.authority_class)||
  statusRank(a.status)-statusRank(b.status)||
  b.inbox_age_minutes-a.inbox_age_minutes||
  String(a.id).localeCompare(String(b.id))
 )
}

export function inboxSlaMinutes(authority?:string|null){return slaForAuthority(authority)}

export function formatInboxSla(item:ExecutiveInboxItem){
 if(item.inbox_sla_breached)return `SLA vencido · ${item.inbox_age_minutes} min`
 return `SLA ${Math.max(0,item.inbox_sla_minutes-item.inbox_age_minutes)} min restantes`
}
