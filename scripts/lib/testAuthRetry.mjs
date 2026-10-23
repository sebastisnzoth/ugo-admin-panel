// UGO Arena TEST only: bounded recovery for transient transport failures.
// Authorization failures (400/401/403), rate limiting (429), and bad credentials
// are never retried or converted into successful sessions.
export function retryableTestAuthError(error){
 const status=Number(error?.status)
 // Explicit HTTP statuses always take precedence over a transport-error class.\n // Never retry a 4xx (including 401/403/429), even if its message says 'timeout'.\n if(Number.isFinite(status)&&status>0)return [500,502,503,504].includes(status)
 return error?.name==='AuthRetryableFetchError'&&
  /gateway timeout|timeout|failed to fetch|fetch failed|network error/i.test(String(error?.message||''))
}

export async function signInForTestWithBoundedRetry(auth,credentials,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),delays=[1200,3200]}={}){
 for(let attempt=0;;attempt++){
  let response
  try{response=await auth.signInWithPassword(credentials)}
  catch(error){
   if(attempt>=delays.length||!retryableTestAuthError(error))throw error
   await wait(delays[attempt])
   continue
  }
  if(!response?.error||attempt>=delays.length||!retryableTestAuthError(response.error))return response
  await wait(delays[attempt])
 }
}
