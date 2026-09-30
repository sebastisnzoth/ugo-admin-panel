export type ExecutiveInboxJob={
 id:string
 correlation_id?:string|null
 authority_class?:string|null
 status?:string|null
 created_at?:string|null
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

export function buildExecutiveInboxItems(jobs:ExecutiveInboxJob[],nowMs=Date.now()):ExecutiveInboxItem[]{
 const newestByWork=new Map<string,ExecutiveInboxJob>()
 for(const job of jobs){
  if(job.status!=='WAITING_APPROVAL'&&job.status!=='BLOCKED')continue
  const key=String(job.correlation_id||job.id)
  const current=newestByWork.get(key)
  if(!current||timestamp(job.created_at)>=timestamp(current.created_at))newestByWork.set(key,job)
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
