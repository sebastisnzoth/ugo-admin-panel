export type AppRoute='demo'|'recruit'|'client-web'|'provider-web'|'stitch-client'|'client'|'provider'|'development'|'admin'|'web'|'landing'

export function resolveAppRoute(search:string):AppRoute{
 const params=new URLSearchParams(search)
 const app=params.get('app')
 if(params.get('demo')==='1')return'demo'
 if(app==='recruit')return'recruit'
 if(app==='client-web'||app==='web-client')return'client-web'
 if(app==='provider-web'||app==='web-provider')return'provider-web'
 if(app==='stitch-client')return'stitch-client'
 if(app==='client')return'client'
 if(app==='provider')return'provider'
 if(app==='development')return'development'
 if(app==='admin')return'admin'
 if(app==='web')return'web'
 return'landing'
}
