import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{ClientEvidenceGallery}from'./ClientEvidenceGallery'
import{ClientPixPaymentPanel}from'./ClientPixPaymentPanel'
import type{Service}from'./shared'

type PaymentState={estado:string|null;mp_payment_id?:string|null;pix_e2e_id?:string|null;pago_externo_id?:string|null}

export function ClientCompletionReview(){
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[service,setService]=useState<Service|null>(null)
 const[hasFinalEvidence,setHasFinalEvidence]=useState(false)
 const[payment,setPayment]=useState<PaymentState|null>(null)
 const[accessToken,setAccessToken]=useState<string|undefined>(undefined)
 const[busy,setBusy]=useState(false)
 const[notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  const{data,error}=await (supabase as any).from('servicios').select('*,categoria:categorias(nombre,emoji),proveedor:usuarios!servicios_proveedor_id_fkey(nombre)').eq('estado','esperando_aprobacion').order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(error){setService(null);return}
  const next=(data||null)as Service|null
  setService(next)
  if(!next){setHasFinalEvidence(false);setPayment(null);return}
  const[{data:evidence,error:evidenceError},{data:pay}]=await Promise.all([
   (supabase as any).from('evidencias_servicio').select('id').eq('servicio_id',next.id).eq('tipo','despues').limit(1),
   (supabase as any).from('pagos').select('estado,mp_payment_id,pix_e2e_id,pago_externo_id').eq('servicio_id',next.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
  ])
  setHasFinalEvidence(!evidenceError&&Boolean(evidence?.length))
  setPayment((pay||null)as PaymentState|null)
 },[supabase])
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setAccessToken(data.session?.access_token));load().catch(()=>{});const ch=supabase.channel('client-completion-review').on('postgres_changes',{event:'*',schema:'public',table:'servicios'},()=>load().catch(()=>{})).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio'},()=>load().catch(()=>{})).on('postgres_changes',{event:'*',schema:'public',table:'pagos'},()=>load().catch(()=>{})).subscribe();return()=>{supabase.removeChannel(ch)}},[load,supabase])
 useEffect(()=>{document.body.classList.toggle('ugo-client-awaiting-review',Boolean(service));return()=>document.body.classList.remove('ugo-client-awaiting-review')},[service])
 if(!service)return null
 const protectedPayment=payment?.estado==='retenido'
 const releasedPayment=payment?.estado==='liberado'
 async function approve(){if(!hasFinalEvidence||!protectedPayment)return;setBusy(true);setNotice('');const{error}=await supabase.rpc('aprobar_servicio',{p_servicio_id:service.id});setBusy(false);if(error){setNotice(error.message);return}setNotice('Trabajo aprobado. El pago protegido fue liberado.');await load()}
 function dispute(){window.dispatchEvent(new Event('ugo:open-dispute'))}
 return <section aria-live="polite" style={{position:'fixed',zIndex:118,left:'50%',bottom:'max(18px,env(safe-area-inset-bottom))',transform:'translateX(-50%)',width:'min(760px,calc(100vw - 24px))',maxHeight:'82dvh',overflowY:'auto',background:'#fff',border:'1px solid #e7ece9',borderRadius:24,padding:16,boxShadow:'0 24px 70px rgba(15,23,42,.20)'}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><small style={{fontWeight:900,color:'#067647',letterSpacing:'.06em'}}>REVISIÓN FINAL</small><h2 style={{margin:'4px 0 2px',fontSize:22}}>Servicio #{service.numero}</h2><p style={{margin:0,fontSize:13,color:'#667085'}}>Revisá las evidencias y confirmá el pago antes de cerrar el servicio.</p></div><span style={{fontSize:24}}>✓</span></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(74px,1fr))',gap:8,marginTop:14,overflowX:'auto',paddingBottom:2}}>{['Pedido','Proveedor','Asignado','Trabajo','Revisión'].map((label,index)=><div key={label} style={{minWidth:74,padding:'10px 8px',borderRadius:12,background:index<4?'#ecfdf3':'#e8f7f2',border:index===4?'1px solid #8fd6bf':'1px solid #d1fadf',textAlign:'center',fontSize:11,fontWeight:800,color:'#344054'}}><div style={{width:24,height:24,borderRadius:999,margin:'0 auto 6px',display:'grid',placeItems:'center',background:index<4?'#6ce9a6':'#079455',color:index<4?'#05603a':'#fff'}}>{index<4?'✓':'5'}</div>{label}</div>)}</div>
  <ClientEvidenceGallery serviceId={service.id}/>
  {!hasFinalEvidence&&<div style={{marginTop:12,padding:11,borderRadius:12,background:'#fff7e6',color:'#7a4b00',fontSize:12,fontWeight:700}}>Todavía no hay una foto final “Después” visible. UGO no habilita el cierre hasta poder revisarla.</div>}
  {!protectedPayment&&!releasedPayment&&<div style={{marginTop:12,padding:12,borderRadius:14,background:'#fff1f0',border:'1px solid #fecdca',color:'#b42318'}}><b>Falta proteger el pago para cerrar el servicio.</b><div style={{fontSize:12,marginTop:4,color:'#7a271a'}}>Podés revisar las evidencias, pero UGO no permitirá liberar fondos hasta que el pago quede confirmado.</div></div>}
  {!protectedPayment&&!releasedPayment&&<div style={{marginTop:12}}><ClientPixPaymentPanel service={service} accessToken={accessToken} embedded/></div>}
  {protectedPayment&&<div style={{marginTop:12,padding:11,borderRadius:12,background:'#ecfdf3',color:'#067647',fontSize:12,fontWeight:800}}>✓ Pago protegido. Cuando apruebes el trabajo, UGO liberará los fondos al proveedor.</div>}
  {releasedPayment&&<div style={{marginTop:12,padding:11,borderRadius:12,background:'#ecfdf3',color:'#067647',fontSize:12,fontWeight:800}}>✓ El pago de este servicio ya fue liberado.</div>}
  {notice&&<div style={{marginTop:12,padding:11,borderRadius:12,background:'#f5f7f6',fontSize:12}}>{notice}</div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10,marginTop:14}}><button type="button" onClick={dispute} disabled={busy} style={{minHeight:48,borderRadius:14,border:'1px solid #d92d20',background:'#fff',color:'#b42318',fontWeight:900,cursor:'pointer'}}>Tengo un problema · Abrir disputa</button><button type="button" onClick={approve} disabled={busy||!hasFinalEvidence||!protectedPayment} style={{minHeight:48,borderRadius:14,border:0,background:hasFinalEvidence&&protectedPayment?'#0aa45c':'#d0d5dd',color:'#fff',fontWeight:900,cursor:hasFinalEvidence&&protectedPayment?'pointer':'not-allowed'}}>{busy?'Procesando…':protectedPayment?'Estoy conforme · Liberar pago':'Protegé el pago para poder aprobar'}</button></div>
 </section>
}
