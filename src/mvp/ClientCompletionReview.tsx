import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{ClientEvidenceGallery}from'./ClientEvidenceGallery'

type ReviewService={id:string;numero:number|string;estado:string;proveedor_id:string|null}

export function ClientCompletionReview(){
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[service,setService]=useState<ReviewService|null>(null)
 const[hasFinalEvidence,setHasFinalEvidence]=useState(false)
 const[busy,setBusy]=useState(false)
 const[notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  const{data,error}=await (supabase as any).from('servicios').select('id,numero,estado,proveedor_id').eq('estado','esperando_aprobacion').order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(error){setService(null);return}
  const next=(data||null)as ReviewService|null
  setService(next)
  if(!next){setHasFinalEvidence(false);return}
  const{data:evidence,error:evidenceError}=await (supabase as any).from('evidencias_servicio').select('id').eq('servicio_id',next.id).eq('tipo','despues').limit(1)
  setHasFinalEvidence(!evidenceError&&Boolean(evidence?.length))
 },[supabase])
 useEffect(()=>{load().catch(()=>{});const ch=supabase.channel('client-completion-review').on('postgres_changes',{event:'*',schema:'public',table:'servicios'},()=>load().catch(()=>{})).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio'},()=>load().catch(()=>{})).subscribe();return()=>{supabase.removeChannel(ch)}},[load,supabase])
 useEffect(()=>{document.body.classList.toggle('ugo-client-awaiting-review',Boolean(service));return()=>document.body.classList.remove('ugo-client-awaiting-review')},[service])
 if(!service)return null
 async function approve(){if(!hasFinalEvidence)return;setBusy(true);setNotice('');const{error}=await supabase.rpc('aprobar_servicio',{p_servicio_id:service.id});setBusy(false);if(error){setNotice(error.message);return}setNotice('Trabajo aprobado. El pago protegido fue liberado.');await load()}
 function dispute(){window.dispatchEvent(new Event('ugo:open-dispute'))}
 return <section aria-live="polite" style={{position:'fixed',zIndex:118,left:'50%',bottom:'max(18px,env(safe-area-inset-bottom))',transform:'translateX(-50%)',width:'min(680px,calc(100vw - 24px))',maxHeight:'78dvh',overflowY:'auto',background:'#fff',border:'1px solid #e7ece9',borderRadius:24,padding:16,boxShadow:'0 24px 70px rgba(15,23,42,.20)'}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><small style={{fontWeight:900,color:'#067647',letterSpacing:'.06em'}}>REVISIÓN FINAL</small><h2 style={{margin:'4px 0 2px',fontSize:22}}>Servicio #{service.numero}</h2><p style={{margin:0,fontSize:13,color:'#667085'}}>Revisá las fotos del proveedor antes de decidir.</p></div><span style={{fontSize:24}}>✓</span></div>
  <ClientEvidenceGallery serviceId={service.id}/>
  {!hasFinalEvidence&&<div style={{marginTop:12,padding:11,borderRadius:12,background:'#fff7e6',color:'#7a4b00',fontSize:12,fontWeight:700}}>Todavía no hay una foto final “Después” visible. UGO no habilita la liberación hasta poder revisarla.</div>}
  {notice&&<div style={{marginTop:12,padding:11,borderRadius:12,background:'#f5f7f6',fontSize:12}}>{notice}</div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10,marginTop:14}}><button type="button" onClick={dispute} disabled={busy} style={{minHeight:48,borderRadius:14,border:'1px solid #d92d20',background:'#fff',color:'#b42318',fontWeight:900,cursor:'pointer'}}>Tengo un problema · Abrir disputa</button><button type="button" onClick={approve} disabled={busy||!hasFinalEvidence} style={{minHeight:48,borderRadius:14,border:0,background:hasFinalEvidence?'#0aa45c':'#d0d5dd',color:'#fff',fontWeight:900,cursor:hasFinalEvidence?'pointer':'not-allowed'}}>{busy?'Procesando…':'Estoy conforme · Liberar pago'}</button></div>
 </section>
}
