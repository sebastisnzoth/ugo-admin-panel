import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import type{Service}from'./shared'
import'./provider-evidence.css'

type EvidenceType='antes'|'durante'|'despues'
type EvidenceRow={id:string;tipo:EvidenceType;storage_path:string;descripcion:string|null;created_at:string;url?:string}
type Props={service?:Service|null}

const BUCKET='service-evidence'
const VISIBLE_STATES=new Set(['llegado','en_progreso','esperando_aprobacion'])

export function ProviderEvidencePanel({service}:Props){
 const supabase=useMemo(()=>getRoleSupabase('provider'),[])
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[kind,setKind]=useState<EvidenceType>('antes'),[rows,setRows]=useState<EvidenceRow[]>([]),[error,setError]=useState('')
 const load=useCallback(async()=>{
  if(!service)return setRows([])
  const{data,error}=await (supabase as any).from('evidencias_servicio').select('id,tipo,storage_path,descripcion,created_at').eq('servicio_id',service.id).order('created_at',{ascending:false})
  if(error)return setError(error.message)
  const base=(data||[]) as EvidenceRow[]
  const withUrls=await Promise.all(base.map(async row=>{const{data:signed}=await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path,900);return{...row,url:signed?.signedUrl}}))
  setRows(withUrls)
 },[service,supabase])
 useEffect(()=>{load().catch(()=>{})},[load])
 useEffect(()=>{if(service?.estado==='en_progreso')setKind('durante');if(service?.estado==='esperando_aprobacion')setKind('despues')},[service?.estado])
 if(!service||!VISIBLE_STATES.has(service.estado))return null
 async function upload(file:File|null){
  if(!file)return
  setError('')
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
  }catch(e){setError(e instanceof Error?e.message:'No se pudo subir la evidencia.')}
  finally{setBusy(false)}
 }
 const hasInitial=rows.some(r=>r.tipo==='antes'),hasFinal=rows.some(r=>r.tipo==='despues')
 return <div className="ugo-provider-evidence">
  <button type="button" className="ugo-evidence-trigger" onClick={()=>setOpen(v=>!v)}>Evidencias {hasFinal?'✓':hasInitial?'•':''}</button>
  {open&&<div className="ugo-evidence-panel">
   <strong>Evidencias del trabajo</strong><p style={{margin:'6px 0 10px',fontSize:12}}>{service.estado==='llegado'?'Podés registrar el estado inicial antes de comenzar.':'Antes de finalizar, UGO exige al menos una foto “Después”.'}</p>
   <select className="ugo-evidence-kind" value={kind} onChange={e=>setKind(e.target.value as EvidenceType)}><option value="antes">Antes</option><option value="durante">Durante</option><option value="despues">Después</option></select>
   <label className={`ugo-evidence-upload${busy?' busy':''}`}>{busy?'Subiendo…':'Tomar o elegir foto'}<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e=>{upload(e.target.files?.[0]||null);e.currentTarget.value=''}} style={{display:'none'}}/></label>
   {error&&<p className="ugo-evidence-error">{error}</p>}
   <div className="ugo-evidence-gallery">{rows.slice(0,6).map(r=><div key={r.id} title={r.tipo} className="ugo-evidence-image">{r.url?<img src={r.url} alt={r.tipo}/>:<span/>}<small>{r.tipo}</small></div>)}</div>
  </div>}
 </div>
}
