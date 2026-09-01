import React,{useCallback,useEffect,useState}from'react'
import{supabase}from'../lib/supabase'
import{money,type Service}from'./shared'

type CompletedService=Service&{categoria?:{nombre:string;emoji:string}|null;cliente?:{nombre:string}|null}
type CompletedPayment={servicio_id:string;estado:string;ganancia_proveedor:number;comision_ugo:number;monto_bruto:number;moneda:string;liberado_at?:string|null}

export function ProviderCompletionCard({activeService}:{activeService?:Service|null}){
 const[service,setService]=useState<CompletedService|null>(null),[payment,setPayment]=useState<CompletedPayment|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const load=useCallback(async()=>{
  if(activeService){setService(null);setPayment(null);return}
  const{data:userData}=await supabase.auth.getUser();const user=userData.user;if(!user)return
  const{data:s,error:se}=await supabase.from('servicios').select('*,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre)').eq('proveedor_id',user.id).eq('estado','completado').order('updated_at',{ascending:false}).limit(1).maybeSingle()
  if(se)throw se;if(!s){setService(null);setPayment(null);return}
  const dismissed=localStorage.getItem(`ugo:provider-completion:${s.id}`)==='done';if(dismissed){setService(null);setPayment(null);return}
  const{data:p,error:pe}=await supabase.from('pagos').select('servicio_id,estado,ganancia_proveedor,comision_ugo,monto_bruto,moneda,liberado_at').eq('servicio_id',s.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(pe)throw pe
  if(!p||p.estado!=='liberado'){setService(null);setPayment(null);return}
  setService(s as CompletedService);setPayment(p as CompletedPayment)
 },[activeService])
 useEffect(()=>{load().catch(e=>setError(e instanceof Error?e.message:'No se pudo cargar el cierre.'))},[load])
 useEffect(()=>{if(activeService)return;const ch=supabase.channel('provider-completion').on('postgres_changes',{event:'*',schema:'public',table:'servicios'},()=>load().catch(()=>{})).on('postgres_changes',{event:'*',schema:'public',table:'pagos'},()=>load().catch(()=>{})).subscribe();return()=>{supabase.removeChannel(ch)}},[activeService,load])
 if(!service||!payment)return null
 async function another(){setBusy(true);setError('');try{const{data:u}=await supabase.auth.getUser();if(!u.user)throw new Error('Sesión no disponible.');const{error:e}=await supabase.from('perfiles_proveedor').update({online:true,disponible:true}).eq('usuario_id',u.user.id);if(e)throw e;localStorage.setItem(`ugo:provider-completion:${service.id}`,'done');setService(null);setPayment(null);window.scrollTo({top:0,behavior:'smooth'})}catch(e){setError(e instanceof Error?e.message:'No se pudo volver al radar.')}finally{setBusy(false)}}
 return <div style={{position:'fixed',inset:0,zIndex:13000,background:'rgba(5,8,12,.78)',backdropFilter:'blur(10px)',display:'grid',placeItems:'center',padding:18}}><section style={{width:'min(420px,100%)',background:'#fff',borderRadius:28,padding:24,boxShadow:'0 30px 90px rgba(0,0,0,.35)',textAlign:'center'}}><div style={{width:72,height:72,borderRadius:999,margin:'0 auto 14px',display:'grid',placeItems:'center',fontSize:34,background:'#eefcf3'}}>✓</div><small style={{fontWeight:900,letterSpacing:1.2}}>TRABAJO APROBADO</small><h2 style={{margin:'8px 0 4px'}}>Pago liberado</h2><p style={{margin:'0 0 18px',color:'#667085'}}>{service.categoria?.emoji} {service.categoria?.nombre||'Servicio'} #{service.numero}{service.cliente?.nombre?` · ${service.cliente.nombre}`:''}</p><div style={{display:'grid',gap:8,textAlign:'left',background:'#f7f8fa',borderRadius:18,padding:15}}><div style={{display:'flex',justifyContent:'space-between'}}><span>Total del servicio</span><b>{money(payment.monto_bruto,payment.moneda)}</b></div><div style={{display:'flex',justifyContent:'space-between'}}><span>Comisión UGO</span><b>- {money(payment.comision_ugo,payment.moneda)}</b></div><div style={{height:1,background:'#e4e7ec'}}/><div style={{display:'flex',justifyContent:'space-between',fontSize:18}}><strong>Tu ganancia</strong><strong>{money(payment.ganancia_proveedor,payment.moneda)}</strong></div></div><p style={{fontSize:12,color:'#667085',lineHeight:1.45,margin:'14px 0'}}>La ganancia quedó liberada y disponible en tu saldo UGO. Esto no significa por sí solo una transferencia bancaria externa.</p>{error&&<p style={{color:'#b42318',fontSize:12}}>{error}</p>}<button onClick={another} disabled={busy} style={{width:'100%',border:0,borderRadius:16,padding:'14px 18px',fontWeight:900,cursor:'pointer'}}>{busy?'Volviendo al radar…':'Buscar otro trabajo'}</button></section></div>
}
