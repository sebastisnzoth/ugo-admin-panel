type RequestLike={headers?:Record<string,string|undefined>}

const configuredOrigins=String(process.env.UGO_ALLOWED_BROWSER_ORIGINS||'')
 .split(',')
 .map(value=>value.trim())
 .filter(Boolean)

const HUGO_BROWSER_ORIGINS=new Set(['https://sebastisnzoth.github.io',...configuredOrigins])

export function allowedHugoOrigin(req:RequestLike){
 try{
  const origin=String(req.headers?.origin||'').trim()
  if(!origin)return''
  const host=String(req.headers?.host||'').trim()
  if(host&&new URL(origin).host===host)return origin
  return HUGO_BROWSER_ORIGINS.has(origin)?origin:''
 }catch{return''}
}

export function isAllowedHugoRequestOrigin(req:RequestLike){
 const origin=String(req.headers?.origin||'').trim()
 return!origin||Boolean(allowedHugoOrigin(req))
}
