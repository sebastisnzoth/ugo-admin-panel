import{useEffect}from'react'
import{getRoleSupabase}from'../../../lib/roleSupabase'
import{UGO_ENVIRONMENT}from'../../../lib/supabaseProject'

export function DemoSebastianPaymentBridge(){
 useEffect(()=>{
  // P0 guard: nunca interceptar pagos reales fuera de UGO TEST + ?demo
  if(UGO_ENVIRONMENT!=='test')return
  if(typeof window!=='undefined'&&!window.location.search.includes('demo'))return
  const original=window.fetch.bind(window)
  window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url
   if(url.includes('/api/pagos/crear')&&init?.method?.toUpperCase()==='POST'){
    try{
     const body=typeof init.body==='string'?JSON.parse(init.body):null
     const servicioId=body?.servicioId
     if(servicioId){
      const sb=getRoleSupabase('client')
      const{data,error}=await sb.rpc('crear_pago_demo_sebastian',{p_servicio_id:servicioId})
      if(!error&&data){
       return new Response(JSON.stringify({success:true,alreadyPaid:true,demo:true,pagoId:(data as any).id,estado:(data as any).estado,metodo:'demo_sebastian'}),{status:200,headers:{'Content-Type':'application/json'}})
      }
      if(error&&!String(error.message||'').includes('NO_ES_DEMO_SEBASTIAN')){
       return new Response(JSON.stringify({error:error.message||'No se pudo registrar el pago demo.'}),{status:409,headers:{'Content-Type':'application/json'}})
      }
     }
    }catch{/* vacío intencional */}
   }
   return original(input as any,init)
  }
  return()=>{window.fetch=original}
 },[])
 return null
}
