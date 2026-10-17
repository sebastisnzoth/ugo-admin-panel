import React,{useCallback,useEffect,useState}from'react'
import{useLocale}from'../i18n/locale'
import{subscribeRealtimeChannel}from'../lib/realtimeChannel'
import{supabase}from'../lib/supabase'

type Props={onFindAnother?:()=>void}
type CompletedService={id:string;numero:number;descripcion:string;completado_at?:string|null;categoria?:{nombre:string;emoji:string}|null;cliente?:{nombre:string}|null}
type ReleasedPayment={id:string;servicio_id:string;monto_bruto:number;comision_ugo:number;ganancia_proveedor:number;moneda:string;estado:string;metodo?:string|null;mp_payment_id?:string|null;pix_e2e_id?:string|null;liberado_at?:string|null;created_at:string;servicio?:CompletedService|null}
type CashDebt={id:string;saldo_pendiente:number;estado:string;referencia_pago?:string|null}

export function ProviderCompletionReceipt({onFindAnother}:Props){
 const{t,locale}=useLocale()
 const[uid,setUid]=useState(''),[payment,setPayment]=useState<ReleasedPayment|null>(null),[debt,setDebt]=useState<CashDebt|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false)
 const db=supabase as any
 const load=useCallback(async(userId:string)=>{
  const{data,error}=await db.from('pagos').select('id,servicio_id,monto_bruto,comision_ugo,ganancia_proveedor,moneda,estado,metodo,mp_payment_id,pix_e2e_id,liberado_at,created_at,servicio:servicios!pagos_servicio_id_fkey(id,numero,descripcion,completado_at,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre))').eq('proveedor_id',userId).eq('estado','liberado').order('liberado_at',{ascending:false}).limit(1).maybeSingle()
  if(error)return
  const row=(data as ReleasedPayment|null)||null
  setPayment(row)
  if(!row){setDebt(null);return setOpen(false)}
  if(row.metodo==='efectivo'){const{data:debtRow}=await db.from('deudas_ugo_proveedor').select('id,saldo_pendiente,estado,referencia_pago').eq('pago_id',row.id).maybeSingle();setDebt((debtRow as CashDebt|null)||null)}else setDebt(null)
  const dismissed=localStorage.getItem(`ugo:provider-completion-dismissed:${userId}`)
  if(dismissed!==row.id)setOpen(true)
 },[db])
 const[channelEpoch,setChannelEpoch]=useState(0)
 useEffect(()=>{let alive=true;let channel:any=null,disposeChannel:(()=>void)|null=null;supabase.auth.getUser().then(({data})=>{if(!alive||!data.user)return;const id=data.user.id;setUid(id);load(id);channel=supabase.channel(`provider-completion-${id}`).on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`proveedor_id=eq.${id}`},()=>load(id));disposeChannel=subscribeRealtimeChannel(channel,supabase,{onSync:()=>load(id),onReconnect:()=>{if(alive)setChannelEpoch(v=>v+1)}})});return()=>{alive=false;if(disposeChannel)disposeChannel();else if(channel)supabase.removeChannel(channel)}},[load,channelEpoch])
 if(!open||!payment)return null
 const service=payment.servicio,isCash=payment.metodo==='efectivo',ref=payment.pix_e2e_id||payment.mp_payment_id||payment.id,method=payment.metodo==='pix_direto'?'Pix direto UGO':payment.metodo==='pix'?'Pix':payment.metodo==='mercadopago'?'Mercado Pago':isCash?t('providerReceipt.cashCollected'):'Pago UGO',formatMoney=(value:number)=>new Intl.NumberFormat(locale,{style:'currency',currency:/^[A-Z]{3}$/i.test(payment.moneda)?payment.moneda:'BRL'}).format(value)
 async function another(){if(!uid)return;setBusy(true);await db.from('perfiles_proveedor').update({online:true,disponible:true}).eq('usuario_id',uid);localStorage.setItem(`ugo:provider-completion-dismissed:${uid}`,payment.id);setBusy(false);setOpen(false);onFindAnother?.()}
 function close(){if(uid)localStorage.setItem(`ugo:provider-completion-dismissed:${uid}`,payment.id);setOpen(false)}
 return <div style={{position:'fixed',inset:0,zIndex:13050,background:'rgba(5,10,14,.72)',backdropFilter:'blur(8px)',display:'grid',placeItems:'center',padding:18}}>
  <section style={{width:'min(430px,100%)',background:'#fff',borderRadius:28,padding:22,boxShadow:'0 24px 80px rgba(0,0,0,.35)',color:'#101418'}}>
   <div style={{width:58,height:58,borderRadius:999,display:'grid',placeItems:'center',margin:'0 auto 10px',background:'#eaf9ef',fontSize:30}}>✓</div>
   <div style={{textAlign:'center'}}><small style={{fontWeight:900,letterSpacing:1,color:'#258a49'}}>{isCash?t('providerReceipt.cashRegistered'):t('providerReceipt.paymentReleased')}</small><h2 style={{margin:'6px 0 4px'}}>{t('providerReceipt.approved')}</h2><p style={{margin:0,color:'#657079',fontSize:13}}>{isCash?t('providerReceipt.cashApproved',{number:service?.numero||''}):t('providerReceipt.digitalApproved',{number:service?.numero||''})}</p></div>
   <div style={{margin:'18px 0',padding:16,borderRadius:20,background:'#f7f9fa'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:10}}><span style={{color:'#657079'}}>{t('providerReceipt.service')}</span><b>{service?.categoria?.emoji} {service?.categoria?.nombre||`#${service?.numero||''}`}</b></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:10}}><span style={{color:'#657079'}}>{t('providerReceipt.client')}</span><b>{service?.cliente?.nombre||'Cliente UGO'}</b></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:10}}><span style={{color:'#657079'}}>{isCash?t('providerReceipt.cashCollected'):t('providerReceipt.total')}</span><b>{formatMoney(payment.monto_bruto)}</b></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:10}}><span style={{color:'#657079'}}>{t('providerReceipt.commission')}</span><b>{isCash?t('providerReceipt.pending'):'- '}{formatMoney(payment.comision_ugo)}</b></div>
    <div style={{height:1,background:'#dde2e5',margin:'12px 0'}}/>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'end'}}><span style={{fontWeight:800}}>{isCash?t('providerReceipt.net'):t('providerReceipt.earned')}</span><strong style={{fontSize:27}}>{formatMoney(payment.ganancia_proveedor)}</strong></div>
   </div>
   {isCash&&debt&&<div style={{margin:'-4px 0 16px',padding:12,borderRadius:16,background:debt.estado==='pagado'?'#e5f5e9':'#fff0da',border:`1px solid ${debt.estado==='pagado'?'#a6f4c5':'#fedf89'}`,fontSize:12,lineHeight:1.5}}><b>{debt.estado==='pagado'?t('providerReceipt.commissionPaid'):t('providerReceipt.commissionDue')}</b><div>{debt.estado==='pagado'?t('providerReceipt.noDebt'):t('providerReceipt.balanceDebt',{amount:formatMoney(debt.saldo_pendiente)})}</div>{debt.referencia_pago&&<small>{t('providerReceipt.reference',{reference:debt.referencia_pago})}</small>}</div>}
   <details style={{fontSize:12,marginBottom:16}}><summary style={{cursor:'pointer',fontWeight:800}}>{t('providerReceipt.receipt')}</summary><div style={{padding:'10px 2px 0',lineHeight:1.65,color:'#59636b'}}>{t('providerReceipt.method')}: {method}<br/>{t('providerReceipt.reference',{reference:''}).split(':')[0]}: <span style={{wordBreak:'break-all'}}>{ref}</span><br/>{t('providerReceipt.released')}: {new Date(payment.liberado_at||payment.created_at).toLocaleString(locale)}<br/>{t('providerReceipt.ugoPayment')}: {payment.id}</div></details>
   <button type="button" onClick={another} disabled={busy} style={{width:'100%',border:0,borderRadius:16,padding:'14px 16px',background:'#111820',color:'#fff',fontWeight:900,fontSize:15,cursor:'pointer'}}>{busy?t('providerReceipt.activate'):t('providerReceipt.find')}</button>
   <button type="button" onClick={close} style={{width:'100%',border:0,background:'transparent',padding:'11px',fontWeight:700,color:'#657079',cursor:'pointer'}}>{t('providerReceipt.later')}</button>
  </section>
 </div>
}
