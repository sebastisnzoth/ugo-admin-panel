import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import type{Service}from'./shared'

type EvidenceType='antes'|'durante'|'despues'
type EvidenceRow={id:string;tipo:EvidenceType;storage_path:string;descripcion:string|null;created_at:string;url?:string}
type Props={service?:Service|null}

const BUCKET='service-evidence'
const VISIBLE_STATES=new Set(['llegado','en_progreso','esperando_aprobacion'])

export function ProviderEvidencePanel({service}:Props){
 const supabase=useMemo(()=>getRoleSupabase('provider'),[])
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[kind,setKind]=useState<EvidenceType>('antes'),[rows,setRows]=useState<EvidenceRow[]>([]),[error,setError]=useState(''),[success,setSuccess]=useState('')
 const load=useCallback(async()=>{
  if(!service)return setRows([])
  const{data,error}=await (supabase as any).from('evidencias_servicio').select('id,tipo,storage_path,descripcion,created_at').eq('servicio_id',service.id).order('created_at',{ascending:false})
  if(error)return setError(error.message)
  const base=(data||[]) as EvidenceRow[]
  const withUrls=await Promise.all(base.map(async row=>{const{data:signed}=await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path,900);return{...row,url:signed?.signedUrl}}))
  setRows(withUrls)
 },[service,supabase])
 useEffect(()=>{load().catch(()=>{})},[load])
 useEffect(()=>{
  if(service?.estado==='llegado')setKind('antes')
  if(service?.estado==='en_progreso')setKind('despues')
  if(service?.estado==='esperando_aprobacion')setKind('despues')
 },[service?.estado])
 const hasInitial=rows.some(r=>r.tipo==='antes'),hasFinal=rows.some(r=>r.tipo==='despues')
 useEffect(()=>{
  if(service?.estado==='en_progreso'&&!hasFinal){setKind('despues');setOpen(true)}
 },[service?.estado,service?.id,hasFinal])
 if(!service||!VISIBLE_STATES.has(service.estado))return null
 async function upload(file:File|null){
  if(!file)return
  setError('');setSuccess('')
  if(file.size>10*1024*1024)return setError('La foto supera el límite de 10 MB.')
  setBusy(true)
  try{
   const{data:{session}}=await supabase.auth.getSession()
   const user=session?.user
   if(!user)throw new Error('Tu sesión de proveedor venció. Volvé a iniciar sesión.')
   const ext=(file.name.split('.').pop()||file.type.split('/').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'
   const path=`${service.id}/${user.id}/${crypto.randomUUID()}.${ext}`
   const{error:uploadError}=await supabase.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||'image/jpeg',cacheControl:'3600'})
   if(uploadError)throw uploadError
   const{error:insertError}=await (supabase as any).from('evidencias_servicio').insert({servicio_id:service.id,usuario_id:user.id,tipo:kind,storage_path:path,descripcion:kind==='despues'?'Evidencia final del trabajo':kind==='antes'?'Evidencia al llegar':'Evidencia durante el trabajo',metadata:{mime:file.type||null,size:file.size,source:'provider-app'}})
   if(insertError){await supabase.storage.from(BUCKET).remove([path]);throw insertError}
   await load()
   setSuccess(kind==='despues'?'Foto final guardada. Ya podés finalizar y pedir aprobación.':'Evidencia guardada correctamente.')
  }catch(e){setError(e instanceof Error?e.message:'No se pudo subir la evidencia.')}
  finally{setBusy(false)}
 }
 const finalRequired=service.estado==='en_progreso'&&!hasFinal
 return <div style={{position:'fixed',left:12,top:'max(78px, calc(env(safe-area-inset-top) + 68px))',zIndex:79}}>
  <button type="button" onClick={()=>setOpen(v=>!v)} style={{minHeight:44,border:finalRequired?'2px solid #f79009':0,borderRadius:16,padding:'10px 13px',background:'#fff',boxShadow:'0 8px 28px rgba(0,0,0,.16)',fontWeight:800,color:'#101828'}}>{finalRequired?'📷 Subir foto final':'📷 Evidencias'} {hasFinal?'✓':hasInitial?'•':''}</button>
  {open&&<div style={{position:'absolute',left:0,top:52,width:320,maxWidth:'calc(100vw - 24px)',maxHeight:'calc(100dvh - 150px)',overflowY:'auto',background:'#fff',borderRadius:20,padding:14,boxShadow:'0 14px 40px rgba(0,0,0,.2)',color:'#101828'}}>
   <strong>{finalRequired?'Foto final obligatoria':'Evidencias del trabajo'}</strong><p style={{margin:'6px 0 10px',fontSize:12,color:finalRequired?'#b54708':'#475467'}}>{service.estado==='llegado'?'Podés registrar el estado inicial antes de comenzar.':finalRequired?'Para finalizar el servicio y pedir aprobación al cliente, subí una foto “Después”.':'La evidencia final ya está registrada.'}</p>
   <select value={kind} onChange={e=>setKind(e.target.value as EvidenceType)} style={{width:'100%',minHeight:44,marginBottom:8,padding:8,fontSize:16}}><option value="antes">Antes</option><option value="durante">Durante</option><option value="despues">Después</option></select>
   <label style={{display:'block',minHeight:48,padding:12,border:`1px dashed ${finalRequired?'#f79009':'#bbb'}`,borderRadius:12,textAlign:'center',cursor:'pointer',fontWeight:700,background:finalRequired?'#fffaeb':'#fff'}}>{busy?'Subiendo…':kind==='despues'?'Tomar o elegir foto final':'Tomar o elegir foto'}<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e=>{upload(e.target.files?.[0]||null);e.currentTarget.value=''}} style={{display:'none'}}/></label>
   {error&&<p style={{fontSize:12,color:'#b42318',margin:'10px 0 0'}}>{error}</p>}
   {success&&<p style={{fontSize:12,color:'#067647',margin:'10px 0 0',fontWeight:700}}>{success}</p>}
   <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginTop:10}}>{rows.slice(0,6).map(r=><div key={r.id} title={r.tipo} style={{aspectRatio:'1',borderRadius:10,overflow:'hidden',background:'#eee',position:'relative'}}>{r.url?<img src={r.url} alt={r.tipo} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span/>}<small style={{position:'absolute',left:4,bottom:4,background:'rgba(0,0,0,.65)',color:'#fff',borderRadius:6,padding:'2px 4px'}}>{r.tipo}</small></div>)}</div>
  </div>}
 </div>
}
