import{useLocale}from'../../i18n/locale'
import React,{useEffect,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{UserProfileAvatar}from'../UserProfileAvatar'
import'./ProviderCustomerCard.css'
type Customer={nombre:string|null;foto_url:string|null;karma:number|null}
export function ProviderCustomerCard({clientId,serviceId,compact=false}:{clientId:string;serviceId:string;compact?:boolean}){
 const{t}=useLocale();
 const[customer,setCustomer]=useState<Customer|null>(null),[previous,setPrevious]=useState<number|null>(null),[loading,setLoading]=useState(true)
 useEffect(()=>{let alive=true;const supabase=getRoleSupabase('provider');setLoading(true);setCustomer(null);setPrevious(null)
 // Only count contracts involving the signed-in provider: RLS prevents seeing unrelated orders.
 void supabase.auth.getUser().then(async({data})=>{const uid=data.user?.id;if(!uid)return
 const [identity,contracts]=await Promise.all([
 supabase.rpc('obter_perfiles_participantes',{p_ids:[clientId]}),
 supabase.from('servicios').select('id',{count:'exact',head:true}).eq('cliente_id',clientId).eq('proveedor_id',uid)
 ])
 if(!alive)return
 if(!identity.error)setCustomer((identity.data?.find(row=>row.id===clientId)||null) as Customer|null)
 if(!contracts.error)setPrevious(contracts.count??null)
 }).catch(()=>{}).finally(()=>{if(alive)setLoading(false)})
 return()=>{alive=false}
 },[clientId,serviceId])
 const rating=Number(customer?.karma),rated=customer?.karma!=null&&Number.isFinite(rating)&&rating>0
 return <section className={`ugo-provider-customer-card${compact?' is-compact':''}`} aria-label={t('screen.provider_customer.1')}>
 <header><span>{t('screen.provider_customer.1')}</span><strong>{t('screen.provider_customer.2')}</strong></header>
 <div className="ugo-provider-customer-main"><UserProfileAvatar name={customer?.nombre||t('providerCustomer.ugoClient')} role="client" photoUrl={customer?.foto_url||null} size={64}/>
 <div><h3>{customer?.nombre||t('providerCustomer.ugoClient')}</h3><p>{t('screen.provider_customer.3')}</p></div></div>
 <div className="ugo-provider-customer-stats"><div><strong>{rated?`★ ${rating.toFixed(1)}`:t('providerCustomer.notRated')}</strong><small>{t('screen.provider_customer.4')}</small></div><div><strong>{previous??'—'}</strong><small>{t('screen.provider_customer.5')}</small></div></div>
 <p className="ugo-provider-customer-caption">{loading?t('providerCustomer.loading'):t('providerCustomer.caption')}</p>
 </section>
}
