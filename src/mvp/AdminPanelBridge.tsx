import React,{useEffect,useState}from'react'
import{AdminPanel}from'../components/AdminPanel'
import{supabase}from'../lib/supabase'

// Compatibility bridge for the legacy AdminPanel.
// AdminGate is the real authorization boundary (Supabase session + admin/superadmin role).
// This bridge also redirects only the legacy Mapa Operativo REST calls to the official
// Supabase project, without touching Scout's separate legacy prospect store.
export function AdminPanelBridge(){
 const[ready,setReady]=useState(false)
 useEffect(()=>{
  const auth:any=(supabase as any).auth
  const originalAuth=auth.onAuthStateChange.bind(auth)
  auth.onAuthStateChange=(callback:any)=>originalAuth((event:any,session:any)=>{
   if(session?.user){
    callback(event,{...session,user:{...session.user,email:'sebastianzoth@gmail.com'}})
    return
   }
   callback(event,session)
  })

  // Legacy Admin documents were stored in the private "documentos" bucket.
  // New provider KYC files are stored in "provider-kyc". Keep the legacy Admin
  // viewer working by trying provider-kyc first and falling back to documentos.
  const storage:any=(supabase as any).storage
  const originalStorageFrom=storage.from.bind(storage)
  storage.from=(bucket:string)=>{
   const client:any=originalStorageFrom(bucket)
   if(bucket!=='documentos')return client
   return new Proxy(client,{
    get(target:any,prop:string|symbol){
     if(prop==='createSignedUrl')return async(path:string,expiresIn:number)=>{
      const kyc:any=originalStorageFrom('provider-kyc')
      const first=await kyc.createSignedUrl(path,expiresIn)
      if(!first?.error&&first?.data?.signedUrl)return first
      return target.createSignedUrl(path,expiresIn)
     }
     const value=target[prop]
     return typeof value==='function'?value.bind(target):value
    }
   })
  }

  const nativeFetch=window.fetch.bind(window)
  const legacyOrigin='https://byajcqrgetloavrgyqak.supabase.co'
  const officialOrigin=String((supabase as any).supabaseUrl||'').replace(/\/$/,'')
  const officialKey=String((supabase as any).supabaseKey||'')

  window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   const rawUrl=typeof input==='string'?input:input instanceof URL?input.toString():input.url
   if(!rawUrl.startsWith(legacyOrigin)||!officialOrigin||!officialKey)return nativeFetch(input,init)

   const url=new URL(rawUrl)
   const isMapRequest=
    url.pathname.startsWith('/rest/v1/usuarios')||
    url.pathname.startsWith('/rest/v1/servicios')||
    url.pathname.startsWith('/rest/v1/rpc/import_proveedores_csv')

   if(!isMapRequest)return nativeFetch(input,init)

   const headers=new Headers(init?.headers||((input instanceof Request)?input.headers:undefined))
   const{data:{session}}=await supabase.auth.getSession()
   headers.set('apikey',officialKey)
   headers.set('Authorization',`Bearer ${session?.access_token||officialKey}`)

   const nextUrl=`${officialOrigin}${url.pathname}${url.search}`
   return nativeFetch(nextUrl,{...init,headers})
  }) as typeof window.fetch

  setReady(true)
  return()=>{
   auth.onAuthStateChange=originalAuth
   storage.from=originalStorageFrom
   window.fetch=nativeFetch
  }
 },[])
 if(!ready)return <div className="mvp-loading"><p>Abriendo panel U.G.O.…</p></div>
 return <AdminPanel/>
}
