import React,{useEffect,useState}from'react'
import{AdminPanel}from'../components/AdminPanel'
import{supabase}from'../lib/supabase'

type LegacySection='dashboard'|'mapa_ops'|'servicios'|'alertas'|'disputas'|'scout'|'usuarios'|'documentos'|'finanzas'|'categorias'|'tarifas'|'analytics'|'notificaciones'|'reportes'|'config'|'validacion_paises'|'import_provs'
const SECTION_LABEL:Record<LegacySection,string>={
 dashboard:'Panel',mapa_ops:'Mapa Live',servicios:'Servs',alertas:'Alertas',disputas:'Disput',scout:'Scout',
 usuarios:'Usrs',documentos:'Docs',finanzas:'Finanzas',categorias:'Cats',tarifas:'Tarifas',analytics:'Analytics',
 notificaciones:'Notifs',reportes:'Reports',config:'Config',validacion_paises:'KYC',import_provs:'Import'
}

export function AdminPanelBridge({section='dashboard',embedded=false}:{section?:LegacySection;embedded?:boolean}){
 const[ready,setReady]=useState(false)
 useEffect(()=>{
  const auth:any=(supabase as any).auth
  const originalAuth=auth.onAuthStateChange.bind(auth)
  auth.onAuthStateChange=(callback:any)=>originalAuth((event:any,session:any)=>{
   if(session?.user){callback(event,{...session,user:{...session.user,email:'sebastianzoth@gmail.com'}});return}
   callback(event,session)
  })

  const storage:any=(supabase as any).storage
  const originalStorageFrom=storage.from.bind(storage)
  storage.from=(bucket:string)=>{
   const client:any=originalStorageFrom(bucket)
   if(bucket!=='documentos')return client
   return new Proxy(client,{get(target:any,prop:string|symbol){
    if(prop==='createSignedUrl')return async(path:string,expiresIn:number)=>{
     const first=await originalStorageFrom('provider-kyc').createSignedUrl(path,expiresIn)
     if(!first?.error&&first?.data?.signedUrl)return first
     return target.createSignedUrl(path,expiresIn)
    }
    const value=target[prop];return typeof value==='function'?value.bind(target):value
   }})
  }

  const nativeFetch=window.fetch.bind(window)
  const legacyOrigin='https://byajcqrgetloavrgyqak.supabase.co'
  const officialOrigin=String((supabase as any).supabaseUrl||'').replace(/\/$/,'')
  const officialKey=String((supabase as any).supabaseKey||'')

  window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const rawUrl=typeof input==='string'?input:input instanceof URL?input.toString():input.url
   if(!rawUrl.startsWith(legacyOrigin)||!officialOrigin||!officialKey)return nativeFetch(input,init)
   const url=new URL(rawUrl)
   const{data:{session}}=await supabase.auth.getSession()
   const headers=new Headers(init?.headers||((input instanceof Request)?input.headers:undefined))
   headers.set('apikey',officialKey)
   headers.set('Authorization',`Bearer ${session?.access_token||officialKey}`)

   if(url.pathname.startsWith('/rest/v1/usuarios')){
    const q=new URLSearchParams(url.search)
    q.set('select','id,nombre,apellido,tipo,email,telefono,categoria,karma,activo,online,lat,lng,zona,endereco,bio')
    const next=`${officialOrigin}/rest/v1/mapa_operativo_usuarios?${q.toString()}`
    return nativeFetch(next,{...init,headers})
   }

   if(url.pathname.startsWith('/rest/v1/servicios')){
    const q=new URLSearchParams()
    q.set('select','id,estado,descripcion,tarifa,created_at,lat_cliente,lng_cliente,proveedor_lat,proveedor_lng')
    q.set('estado','in.(buscando,ofrecido,asignado,en_camino,llegado,en_progreso,esperando_aprobacion)')
    q.set('limit','100')
    const r=await nativeFetch(`${officialOrigin}/rest/v1/mapa_operativo_servicios?${q.toString()}`,{...init,headers})
    if(!r.ok)return r
    const rows=await r.json()
    const body=JSON.stringify((Array.isArray(rows)?rows:[]).map((s:any)=>({...s,proveedor:s.proveedor_lat!=null&&s.proveedor_lng!=null?{lat:s.proveedor_lat,lng:s.proveedor_lng}:null})))
    return new Response(body,{status:r.status,statusText:r.statusText,headers:{'Content-Type':'application/json'}})
   }

   if(url.pathname.startsWith('/rest/v1/rpc/import_proveedores_csv'))return nativeFetch(`${officialOrigin}${url.pathname}${url.search}`,{...init,headers})
   return nativeFetch(input,init)
  }) as typeof window.fetch

  setReady(true)
  return()=>{auth.onAuthStateChange=originalAuth;storage.from=originalStorageFrom;window.fetch=nativeFetch}
 },[])
 useEffect(()=>{
  if(!ready)return
  let tries=0
  const select=()=>{
   const label=SECTION_LABEL[section]
   const button=[...document.querySelectorAll('.ugo-admin-embedded .nav-item')].find(el=>el.querySelector('.nav-label')?.textContent?.trim()===label) as HTMLButtonElement|undefined
   if(button){button.click();return}
   if(tries++<16)window.setTimeout(select,90)
  }
  window.setTimeout(select,0)
 },[ready,section])
 if(!ready)return <div className="mvp-loading"><p>Abriendo panel U.G.O.…</p></div>
 return <div className={embedded?'ugo-admin-embedded':''}>
  {embedded&&<style>{`.ugo-admin-embedded{height:100%;min-height:0}.ugo-admin-embedded .ua{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr)!important;height:100%!important}.ugo-admin-embedded .ua-tb,.ugo-admin-embedded .ua-nav,.ugo-admin-embedded .ua-hugo{display:none!important}.ugo-admin-embedded .ua-main{grid-column:1!important;grid-row:1!important;min-width:0!important}.ugo-admin-embedded .pad{height:100%!important}.ugo-admin-embedded .map-wrap{height:100%!important}`}</style>}
  <AdminPanel/>
 </div>
}
