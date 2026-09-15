const RAW_API_BASE=String(import.meta.env.VITE_API_BASE_URL||'').trim()
const API_BASE=RAW_API_BASE.replace(/\/+$/,'')
let installed=false

function rewriteApiInput(input:RequestInfo|URL):RequestInfo|URL{
 if(!API_BASE)return input
 if(typeof input==='string')return input.startsWith('/api/')?`${API_BASE}${input}`:input
 if(input instanceof URL){
  if(input.origin===window.location.origin&&input.pathname.startsWith('/api/'))return new URL(`${API_BASE}${input.pathname}${input.search}`)
  return input
 }
 if(input instanceof Request){
  const url=new URL(input.url,window.location.href)
  if(url.origin===window.location.origin&&url.pathname.startsWith('/api/'))return new Request(`${API_BASE}${url.pathname}${url.search}`,input)
 }
 return input
}

export function installApiRuntimeBase(){
 if(installed||!API_BASE||typeof window==='undefined')return
 installed=true
 const nativeFetch=window.fetch.bind(window)
 window.fetch=(input:RequestInfo|URL,init?:RequestInit)=>nativeFetch(rewriteApiInput(input),init)
}

export function getApiRuntimeBase(){return API_BASE}
