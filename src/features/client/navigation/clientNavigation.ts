export type ClientNoticeLike={tipo:string;datos?:Record<string,unknown>|null}
export type ClientNoticeDestination={kind:'dispute'}|{kind:'review'}|{kind:'service';serviceId:string}|{kind:'home'}
export function clientDeepLinkedServiceId(search:string){return new URLSearchParams(search).get('serviceId')}
export function clientNoticeDestination(notice:ClientNoticeLike):ClientNoticeDestination{if(notice.tipo.includes('disputa'))return{kind:'dispute'};if(notice.tipo==='servicio_completado')return{kind:'review'};const serviceId=typeof notice.datos?.servicio_id==='string'?notice.datos.servicio_id:null;return serviceId?{kind:'service',serviceId}:{kind:'home'}}
