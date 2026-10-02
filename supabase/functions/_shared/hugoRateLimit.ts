type Bucket={count:number;resetAt:number}
const buckets=new Map<string,Bucket>()
const WINDOW_MS=60_000
const MAX_BUCKETS=2_048

const positiveInt=(value:string|undefined,fallback:number)=>{const n=Number(value);return Number.isInteger(n)&&n>0?n:fallback}
const LIMITS={
 ip:positiveInt(Deno.env.get('HUGO_RATE_LIMIT_IP_PER_MINUTE'),120),
 chat:positiveInt(Deno.env.get('HUGO_RATE_LIMIT_USER_PER_MINUTE'),45),
 live:positiveInt(Deno.env.get('HUGO_LIVE_RATE_LIMIT_USER_PER_MINUTE'),20),
}

function clientIp(req:Request){
 const forwarded=(req.headers.get('x-forwarded-for')||'').split(',')[0]?.trim()
 return forwarded||req.headers.get('x-real-ip')?.trim()||'unknown'
}
function prune(now:number){
 if(buckets.size<MAX_BUCKETS)return
 for(const[key,bucket]of buckets)if(bucket.resetAt<=now)buckets.delete(key)
 if(buckets.size<MAX_BUCKETS)return
 let remove=buckets.size-MAX_BUCKETS+1
 for(const key of buckets.keys()){buckets.delete(key);if(--remove<=0)break}
}
function consume(key:string,limit:number,now=Date.now()){
 prune(now)
 const current=buckets.get(key)
 const bucket=!current||current.resetAt<=now?{count:0,resetAt:now+WINDOW_MS}:current
 bucket.count++
 buckets.set(key,bucket)
 if(bucket.count<=limit)return
 const retryAfter=Math.max(1,Math.ceil((bucket.resetAt-now)/1000))
 throw Object.assign(new Error('Demasiadas solicitudes a Hugo. Reintentá en unos segundos.'),{status:429,code:'HUGO_RATE_LIMITED',retryAfter})
}
export function enforceHugoEdgeIpRateLimit(req:Request){consume('ip:'+clientIp(req),LIMITS.ip)}
export function enforceHugoEdgeUserRateLimit(userId:string,scope:'chat'|'live'){consume(scope+':user:'+String(userId||'unknown'),scope==='live'?LIMITS.live:LIMITS.chat)}
