export type ProviderCalendarStatus={configured:boolean;connected:boolean;email:string|null;calendarId:string|null;updatedAt:string|null}
async function request<T>(accessToken:string,path:string,init:RequestInit={}){const response=await fetch('/api/calendar/'+path,{...init,headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json',...(init.headers||{})}}),payload=await response.json().catch(()=>({})) as Record<string,unknown>;if(!response.ok)throw new Error(String(payload.error||'No se pudo comunicar con Google Calendar.'));return payload as T}
export const getProviderCalendarStatus=(token:string)=>request<ProviderCalendarStatus>(token,'status')
export const startProviderCalendar=(token:string)=>request<{url:string}>(token,'start')
export const syncProviderCalendar=(token:string)=>request<{configured:boolean;connected:boolean;created:number;updated:number;deleted:number;syncedAt?:string}>(token,'sync',{method:'POST'})
export const disconnectProviderCalendar=(token:string)=>request<{connected:false}>(token,'disconnect',{method:'POST'})
