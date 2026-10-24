// Bounded, TEST-only retry for read-only bootstrap queries.
// Never retry mutations or convert an unavailable database into a PASS.
export function isTransientReadOutage(error){
  const cause=error?.cause||error
  const code=String(cause?.code||error?.p0?.error?.code||'')
  const status=Number(cause?.status||error?.p0?.error?.status||0)
  // Authorization failures must never be reclassified as transient, even if their text mentions a timeout.
  if ([401,403].includes(status)||['42501','PGRST116'].includes(code)) return false
  const message=String(cause?.message||error?.p0?.error?.message||error?.message||'').trim().toLowerCase()
  // Some TEST gateway failures have no HTTP status or PostgREST code; match only the exact observed upstream error.
  return ['PGRST000','PGRST002'].includes(code)||[502,503,504,522].includes(status)||(status===0&&code===''&&message==='upstream request timeout')
}
export async function readWithTransientRetry(read,{sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),onRetry=()=>{}}={}){
  const delays=[1200,3000]
  for(let attempt=0;attempt<=delays.length;attempt++){
    try{return await read()}
    catch(error){
      if(attempt===delays.length||!isTransientReadOutage(error))throw error
      onRetry({attempt:attempt+1,code:String(error?.cause?.code||error?.p0?.error?.code||'unknown'),delayMs:delays[attempt]})
      await sleep(delays[attempt])
    }
  }
  throw new Error('UNREACHABLE_READ_RETRY')
}
