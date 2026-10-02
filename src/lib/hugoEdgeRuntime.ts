const RAW_HUGO_EDGE_URL=String(import.meta.env.VITE_HUGO_EDGE_URL||'').trim()
const HUGO_EDGE_URL=RAW_HUGO_EDGE_URL.replace(/\/+$/,'')

export function getHugoRuntimeUrl(fallback:string){
 if(typeof window!=='undefined'){
  const host=window.location.hostname.toLowerCase()
  if(host==='ugo-admin-panel.vercel.app'||host.endsWith('.vercel.app'))return fallback
  if(host.endsWith('github.io'))return HUGO_EDGE_URL||fallback
 }
 return HUGO_EDGE_URL||fallback
}

export function hasHugoEdgeRuntime(){
 return Boolean(HUGO_EDGE_URL)
}
