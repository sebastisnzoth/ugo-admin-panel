import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../../../lib/roleSupabase'
import'./clientRequestEvidence.css'

type Row={id:string;storage_path:string;descripcion:string|null;created_at:string;url?:string|null}
type Props={draftId:string;inline?:boolean;onBusyChange?:(busy:boolean)=>void;onCountChange?:(count:number)=>void}
const BUCKET='request-evidence'
const MAX_FILE_SIZE=10*1024*1024

function normalizedMime(file:File){const mime=(file.type||'image/jpeg').toLowerCase();if(mime==='image/jpg'||mime==='image/pjpeg')return'image/jpeg';return mime}
function fallbackExtension(mime:string){if(mime==='image/png')return'png';if(mime==='image/webp')return'webp';if(mime==='image/heic')return'heic';if(mime==='image/heif')return'heif';return'jpg'}

export function ClientRequestEvidence({draftId,inline=false,onBusyChange,onCountChange}:Props){
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[rows,setRows]=useState<Row[]>([]),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const load=useCallback(async()=>{if(!draftId){setRows([]);return}const{data:{user}}=await supabase.auth.getUser();if(!user){setRows([]);return}const{data,error}=await supabase.from('evidencias_solicitud').select('id,storage_path,descripcion,created_at').eq('cliente_id',user.id).eq('draft_id',draftId).is('servicio_id',null).order('created_at',{ascending:true});if(error){console.error('No pudimos cargar evidencia de solicitud.',error);setError('No pudimos cargar las fotos. Podés continuar sin foto.');return}const signed=await Promise.all(((data||[])as Row[]).map(async row=>{const{data:signedData}=await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path,900);return{...row,url:signedData?.signedUrl||null}}));setRows(signed)},[draftId,supabase])
 useEffect(()=>{setError('');load().catch(error=>{console.error('No pudimos cargar evidencia de solicitud.',error)})},[load])
 useEffect(()=>{onBusyChange?.(busy)},[busy,onBusyChange])
 useEffect(()=>{onCountChange?.(rows.length)},[onCountChange,rows.length])

 async function upload(file:File|null){
  if(!file)return
  if(!draftId){setError('No pudimos preparar las fotos todavía. Podés continuar sin foto.');return}
  if(file.size>MAX_FILE_SIZE){setError('La foto supera el límite de 10 MB. Elegí una más liviana o continuá sin foto.');return}
  const mime=normalizedMime(file)
  if(!mime.startsWith('image/')){setError('Ese archivo no parece ser una imagen. Elegí una foto o continuá sin adjuntarla.');return}
  let uploadedPath:string|null=null
  setBusy(true);setError('')
  try{
   const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('AUTH_REQUIRED')
   const nameExtension=(file.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'')
   const extension=nameExtension||fallbackExtension(mime)
   const path=`${user.id}/${draftId}/${crypto.randomUUID()}.${extension}`
   const{error:uploadError}=await supabase.storage.from(BUCKET).upload(path,file,{contentType:mime,upsert:false})
   if(uploadError)throw uploadError
   uploadedPath=path
   const{error:insertError}=await supabase.from('evidencias_solicitud').insert({cliente_id:user.id,draft_id:draftId,storage_path:path,descripcion:'Evidencia aportada por el cliente antes del matching',metadata:{mime,size:file.size,request_draft_id:draftId}})
   if(insertError)throw insertError
   await load()
  }catch(uploadFailure){
   if(uploadedPath)await supabase.storage.from(BUCKET).remove([uploadedPath])
   console.error('No pudimos subir evidencia de solicitud.',uploadFailure)
   if(uploadFailure instanceof Error&&uploadFailure.message==='AUTH_REQUIRED')setError('Iniciá sesión para adjuntar fotos. La solicitud puede continuar sin foto.')
   else setError('No pudimos subir la foto. Probá otra vez o enviá la solicitud sin foto.')
  }finally{setBusy(false)}
 }

 async function remove(row:Row){setBusy(true);setError('');try{const{error:deleteError}=await supabase.from('evidencias_solicitud').delete().eq('id',row.id).eq('draft_id',draftId).is('servicio_id',null);if(deleteError)throw deleteError;const{error:storageError}=await supabase.storage.from(BUCKET).remove([row.storage_path]);if(storageError)console.warn('La fila fue eliminada pero Storage no pudo limpiar el archivo.',storageError);await load()}catch(removeFailure){console.error('No pudimos quitar evidencia de solicitud.',removeFailure);setError('No pudimos quitar la foto. Probá otra vez.')}finally{setBusy(false)}}

 const panel=<section className={`ugo-request-evidence-panel${inline?' is-inline':''}`}><header><div><strong>Fotos del trabajo</strong><p>Podés sumar fotos para darle contexto al profesional. Son opcionales y podés enviar la solicitud sin adjuntar ninguna.</p></div>{!inline&&<button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar fotos">×</button>}</header><div className="ugo-request-evidence-upload-actions"><label className="ugo-request-evidence-upload">{busy?'Subiendo…':'📷 Sacar foto'}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" capture="environment" disabled={busy||!draftId} onChange={event=>{void upload(event.target.files?.[0]||null);event.currentTarget.value=''}}/></label><label className="ugo-request-evidence-upload">{busy?'Subiendo…':'＋ Elegir foto'}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" disabled={busy||!draftId} onChange={event=>{void upload(event.target.files?.[0]||null);event.currentTarget.value=''}}/></label></div>{error&&<div className="ugo-request-evidence-error" role="alert">{error}</div>}<div className="ugo-request-evidence-grid">{rows.map(row=><figure key={row.id}>{row.url?<img src={row.url} alt="Foto opcional del trabajo a realizar"/>:<div/>}<button type="button" disabled={busy} onClick={()=>void remove(row)}>Quitar</button></figure>)}</div>{rows.length===0?<small>Sin fotos adjuntas · podés continuar igual.</small>:<small>✓ {rows.length} foto{rows.length===1?'':'s'} lista{rows.length===1?'':'s'} para dar contexto al profesional.</small>}</section>
 if(inline)return <div className="ugo-request-evidence-inline">{panel}</div>
 return <div className="ugo-request-evidence-dock"><button type="button" className="ugo-request-evidence-trigger" onClick={()=>setOpen(value=>!value)}>📷 Fotos del trabajo {rows.length?`(${rows.length})`:''}</button>{open&&panel}</div>
}
