import React,{useCallback,useEffect,useState}from'react'
import{supabase}from'../lib/supabase'
import type{Service}from'./shared'

type EvidenceType='antes'|'durante'|'despues'
type EvidenceRow={id:string;tipo:EvidenceType;storage_path:string;descripcion:string|null;created_at:string;url?:string}
type Props={service?:Service|null}

const BUCKET='service-evidence'
const VISIBLE_STATES=new Set(['llegado','en_progreso','esperando_aprobacion'])

export function ProviderEvidencePanel({service}:Props){
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[kind,setKind]=useState<EvidenceType>('antes'),[rows,setRows]=useState<EvidenceRow[]>([]),[error,setError]=useState('')
 const load=useCallback(async()=>{
  if(!service)return setRows([])
  const{data,error}=await (supabase as any).from('evidencias_servicio').select('id,tipo,storage_path,descripcion,created_at').eq('servicio_id',service.id).order('created_at',{ascending:false})
  if(error)return setError(error.message)
  const base=(data||[]) as EvidenceRow[]
  const withUrls=await Promise.all(base.map(async row=>{const{data:signed}=await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path,900);return{...row,url:signed?.signedUrl}}))
  setRows(withUrls)
 },[service])
 useEffect(()=>{load().catch(()=>{})},[load])
 useEffect(()=>{if(service?.estado==='en_progreso')setKind('durante');if(service?.estado==='esperando_aprobacion')setKind('despues')},[service?.estado])
 if(!service||!VISIBLE_STATES.has(service.estado))return null
 async function upload(file:File|null){
  if(!file)return
  setError('')
  if(file.size>10*1024*1024)return setError('La foto supera el límite de 10 MB.')
  setBusy(true)
  try{
   const{data:userData}=await supabase.auth.getUser();const user=userData.user
   if(!user)throw new Error('Sesión no disponible.')
   const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'
   const path=`${service.id}/${user.id}/${crypto.randomUUID()}.${ext}`
   const{error:uploadError}=await supabase.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'})
   if(uploadError)throw uploadError
   const{error:insertError}=await (supabase as any).from('evidencias_servicio').insert({servicio_id:service.id,usuario_id:user.id,tipo:kind,storage_path:path,descripcion:kind==='despues'?'Evidencia final del trabajo':kind==='antes'?'Evidencia al llegar':null,metadata:{mime:file.type||null,size:file.size}})
   if(insertError){await supabase.storage.from(BUCKET).remove([path]);throw insertError}
   await load()
  }catch(e){setError(e instanceof Error?e.message:'No se pudo subir la evidencia.')}
  finally{setBusy(false)}
 }
 const hasInitial=rows.some(r=>r.tipo==='antes'),hasFinal=rows.some(r=>r.tipo==='despues')
 return <div style={{position:'fixed',right:16,bottom:92,zIndex:79}}>
  <button type="button" onClick={()=>setOpen(v=>!v)} style={{border:0,borderRadius:18,padding:'12px 14px',background:'#fff',boxShadow:'0 8px 28px rgba(0,0,0,.16)',fontWeight:800}}>📷 Evidencias {hasFinal?'✓':hasInitial?'•':''}</button>
  {open&&<div style={{position:'absolute',right:0,bottom:54,width:300,maxWidth:'calc(100vw - 32px)',background:'#fff',borderRadius:20,padding:14,boxShadow:'0 14px 40px rgba(0,0,0,.2)'}}>
   <strong>Evidencias del trabajo</strong><p style={{margin:'6px 0 10px',fontSize:12}}>{service.estado==='llegado'?'Podés registrar el estado inicial antes de comenzar.':'Antes de finalizar, UGO exige al menos una foto “Después”.'}</p>
   <select value={kind} onChange={e=>setKind(e.target.value as EvidenceType)} style={{width:'100%',marginBottom:8,padding:8}}><option value="antes">Antes</option><option value="durante">Durante</option><option value="despues">Después</option></select>
   <label style={{display:'block',padding:10,border:'1px dashed #bbb',borderRadius:12,textAlign:'center',cursor:'pointer',fontWeight:700}}>{busy?'Subiendo…':'Tomar o elegir foto'}<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e=>{upload(e.target.files?.[0]||null);e.currentTarget.value=''}} style={{display:'none'}}/></label>
   {error&&<p style={{fontSize:12,color:'#b42318'}}>{error}</p>}
   <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginTop:10}}>{rows.slice(0,6).map(r=><div key={r.id} title={r.tipo} style={{aspectRatio:'1',borderRadius:10,overflow:'hidden',background:'#eee',position:'relative'}}>{r.url?<img src={r.url} alt={r.tipo} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span/>}<small style={{position:'absolute',left:4,bottom:4,background:'rgba(0,0,0,.65)',color:'#fff',borderRadius:6,padding:'2px 4px'}}>{r.tipo}</small></div>)}</div>
  </div>}
 </div>
}
