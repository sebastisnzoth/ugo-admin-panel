const RAW_HUGO_EDGE_URL=String(import.meta.env.VITE_HUGO_EDGE_URL||'').trim()
const HUGO_EDGE_URL=RAW_HUGO_EDGE_URL.replace(/\/+$/,'')

export function getHugoRuntimeUrl(fallback:string){
 return HUGO_EDGE_URL||fallback
}

export function hasHugoEdgeRuntime(){
 return Boolean(HUGO_EDGE_URL)
}
