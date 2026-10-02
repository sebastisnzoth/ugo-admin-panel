import{getRoleSupabase}from'../../lib/roleSupabase'
export type ProviderCalendarStatus={configured:boolean;connected:boolean;email:string|null;calendarId:string|null;updatedAt:string|null}
async function request<T>(accessToken:string,path:string,init:RequestInit={}){
 const call=async(token:string)=>{const response=await fetch('/api/calendar/'+path,{...init,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(init.headers||{})}}),payload=await response.json().catch(()=>({})) as Record<string,unknown>;return{response,payload}}
 let current=await call(accessToken)
 if(current.response.status===401){
  const auth=getRoleSupabase('provider')
  const refreshed=await auth.auth.refreshSession()
  const freshToken=refreshed.data.session?.access_token||''
  if(freshToken&&freshToken!==accessToken)current=await call(freshToken)
 }
 if(!current.response.ok)throw new Error(String(current.payload.error||'No se pudo comunicar con Google Calendar.'))
 return current.payload as T
}
export const getProviderCalendarStatus=(token:string)=>request<ProviderCalendarStatus>(token,'status')
export const startProviderCalendar=(token:string)=>request<{url:string}>(token,'start')
export const syncProviderCalendar=(token:string)=>request<{configured:boolean;connected:boolean;created:number;updated:number;deleted:number;syncedAt?:string}>(token,'sync',{method:'POST'})
export const disconnectProviderCalendar=(token:string)=>request<{connected:false}>(token,'disconnect',{method:'POST'})
