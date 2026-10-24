// Calendar endpoints are serverless Vercel routes. A Vite preview build has
// PROD=true but no /api/calendar backend, so DEV alone is not a safe gate.
// Do not suppress requests on real custom domains or Vercel deployments.
export function isCalendarApiHostSupported(hostname:string,development:boolean):boolean{
 const host=hostname.trim().toLowerCase()
 if(development||!host||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.github.io'))return false
 return !['127.0.0.1','0.0.0.0','::1','[::1]'].includes(host)
}
export type ProviderCalendarStatus={configured:boolean;connected:boolean;email:string|null;calendarId:string|null;updatedAt:string|null}
async function request<T>(accessToken:string,path:string,init:RequestInit={}){
 const response=await fetch('/api/calendar/'+path,{...init,headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json',...(init.headers||{})}})
 const payload=await response.json().catch(()=>({})) as Record<string,unknown>
 // Do not force an Auth token refresh from a feature endpoint 401. In particular,
 // Calendar is optional (and absent on Pages); repeated failures must never
 // rotate the Provider session or trigger a request/refresh feedback loop.
 if(response.status===401)throw new Error('Google Calendar no autorizó esta solicitud. Tu sesión UGO permanece activa.')
 if(!response.ok)throw new Error(String(payload.error||'No se pudo comunicar con Google Calendar.'))
 return payload as T
}
export const getProviderCalendarStatus=(token:string)=>request<ProviderCalendarStatus>(token,'status')
export const startProviderCalendar=(token:string)=>request<{url:string}>(token,'start')
export const syncProviderCalendar=(token:string)=>request<{configured:boolean;connected:boolean;created:number;updated:number;deleted:number;syncedAt?:string}>(token,'sync',{method:'POST'})
export const disconnectProviderCalendar=(token:string)=>request<{connected:false}>(token,'disconnect',{method:'POST'})
