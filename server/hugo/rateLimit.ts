type RequestLike={headers?:Record<string,string|undefined>}
type Bucket={count:number;resetAt:number}

const buckets=new Map<string,Bucket>()
const WINDOW_MS=60_000
const MAX_BUCKETS=2_048

function positiveInt(value:string|undefined,fallback:number){
 const parsed=Number(value)
 return Number.isInteger(parsed)&&parsed>0?parsed:fallback
}

const LIMITS={
 ip:positiveInt(process.env.HUGO_RATE_LIMIT_IP_PER_MINUTE,120),
 chat:positiveInt(process.env.HUGO_RATE_LIMIT_USER_PER_MINUTE,45),
 tts:positiveInt(process.env.HUGO_TTS_RATE_LIMIT_USER_PER_MINUTE,20),
}

function clientIp(req:RequestLike){
 const forwarded=String(req.headers?.['x-forwarded-for']||'').split(',')[0]?.trim()
 return forwarded||String(req.headers?.['x-real-ip']||'').trim()||'unknown'
}

function prune(now:number){
 if(buckets.size<MAX_BUCKETS)return
 for(const[key,bucket]of buckets){if(bucket.resetAt<=now)buckets.delete(key)}
 if(buckets.size<MAX_BUCKETS)return
 const overflow=buckets.size-MAX_BUCKETS+1
 let removed=0
 for(const key of buckets.keys()){buckets.delete(key);if(++removed>=overflow)break}
}

function consume(key:string,limit:number,now=Date.now()){
 prune(now)
 const current=buckets.get(key)
 const bucket=!current||current.resetAt<=now?{count:0,resetAt:now+WINDOW_MS}:current
 bucket.count+=1
 buckets.set(key,bucket)
 if(bucket.count<=limit)return
 const retryAfter=Math.max(1,Math.ceil((bucket.resetAt-now)/1000))
 throw Object.assign(new Error('Demasiadas solicitudes a Hugo. Reintentá en unos segundos.'),{status:429,code:'HUGO_RATE_LIMITED',retryAfter})
}

export function enforceHugoIpRateLimit(req:RequestLike){
 consume('ip:'+clientIp(req),LIMITS.ip)
}

export function enforceHugoUserRateLimit(userId:string,scope:'chat'|'tts'){
 consume(scope+':user:'+String(userId||'unknown'),scope==='tts'?LIMITS.tts:LIMITS.chat)
}

export function __resetHugoRateLimitForTests(){buckets.clear()}
