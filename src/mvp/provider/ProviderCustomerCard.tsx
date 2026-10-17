import React,{useEffect,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{UserProfileAvatar}from'../UserProfileAvatar'
import'./ProviderCustomerCard.css'
type Customer={nombre:string|null;foto_url:string|null;karma:number|null}
export function ProviderCustomerCard({clientId,serviceId,compact=false}:{clientId:string;serviceId:string;compact?:boolean}){
 const[customer,setCustomer]=useState<Customer|null>(null),[previous,setPrevious]=useState<number|null>(null),[loading,setLoading]=useState(true)
 useEffect(()=>{let alive=true;const supabase=getRoleSupabase('provider');setLoading(true);setCustomer(null);setPrevious(null)
 // Only count contracts involving the signed-in provider: RLS prevents seeing unrelated orders.
 void supabase.auth.getUser().then(async({data})=>{const uid=data.user?.id;if(!uid)return
 const [identity,contracts]=await Promise.all([
 supabase.from('usuarios').select('nombre,foto_url,karma').eq('id',clientId).maybeSingle(),
 supabase.from('servicios').select('id',{count:'exact',head:true}).eq('cliente_id',clientId).eq('proveedor_id',uid)
 ])
 if(!alive)return
 if(!identity.error)setCustomer(identity.data as Customer|null)
 if(!contracts.error)setPrevious(contracts.count??null)
 }).catch(()=>{}).finally(()=>{if(alive)setLoading(false)})
 return()=>{alive=false}
 },[clientId,serviceId])
 const rating=Number(customer?.karma),rated=customer?.karma!=null&&Number.isFinite(rating)&&rating>0
 return <section className={`ugo-provider-customer-card${compact?' is-compact':''}`} aria-label="Ficha del cliente del pedido">
 <header><span>CLIENTE DEL PEDIDO</span><strong>✓ Pedido asignado</strong></header>
 <div className="ugo-provider-customer-main"><UserProfileAvatar name={customer?.nombre||'Cliente UGO'} role="client" photoUrl={customer?.foto_url||null} size={64}/>
 <div><h3>{customer?.nombre||'Cliente UGO'}</h3><p>Contratante del servicio</p></div></div>
 <div className="ugo-provider-customer-stats"><div><strong>{rated?`★ ${rating.toFixed(1)}`:'Sin valoración'}</strong><small>Valoración disponible</small></div><div><strong>{previous??'—'}</strong><small>Pedidos con vos</small></div></div>
 <p className="ugo-provider-customer-caption">{loading?'Cargando ficha…':'Las contrataciones mostradas son las que compartís con este cliente. Su historial con otros proveedores es privado.'}</p>
 </section>
}
