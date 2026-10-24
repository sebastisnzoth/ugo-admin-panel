// Bounded, TEST-only retry for read-only bootstrap queries.
// Never retry mutations or convert an unavailable database into a PASS.
export function isTransientReadOutage(error){
  const cause=error?.cause||error
  const code=String(cause?.code||error?.p0?.error?.code||'')
  const status=Number(cause?.status||error?.p0?.error?.status||0)
  return ['PGRST000','PGRST002'].includes(code)||[502,503,504].includes(status)
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
