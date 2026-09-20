import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import'./admin-provider-verification.css'

type VerificationState='registrado'|'pendiente'|'verificado'|'rechazado'|'suspendido'
type ProviderRow={usuario_id:string;estado_verificacion:VerificationState;motivo_rechazo:string|null;bio:string|null;tarifa_base:number|string|null;online:boolean;disponible:boolean;ciudad_base:string|null;telefono_profesional:string|null;experiencia_anos:number|null;especialidades:any;updated_at:string;categoria_principal_id:string|null;usuario?:{nombre:string;apellido:string|null;email:string|null;karma:number;servicios_completados:number;activo:boolean;zona:string|null;pais:string|null}|null;categoria?:{nombre:string;emoji:string}|null}
type ProviderDoc={id:string;usuario_id:string;tipo:string;estado:string;url_storage:string;descripcion:string|null;notas:string|null;notas_rechazo:string|null;ocr_valido:boolean|null;ocr_confianza:number|null;created_at:string;updated_at:string|null;revisado_at:string|null}
type VerificationResponse={error?:string;success?:boolean}

const expected=['identidad_frente','identidad_dorso','selfie','comprobante_domicilio']
const label=(s:VerificationState)=>({registrado:'Registrado',pendiente:'Pendiente',verificado:'Verificado',rechazado:'Rechazado',suspendido:'Suspendido'}[s])
const docLabel=(s:string)=>({identidad_frente:'Identidad · frente',identidad_dorso:'Identidad · dorso',selfie:'Selfie',comprobante_domicilio:'Comprobante de domicilio'} as Record<string,string>)[s]||s.replaceAll('_',' ')
const when=(v?:string|null)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const specialText=(v:any)=>Array.isArray(v)?v.join(', '):v&&typeof v==='object'?JSON.stringify(v):String(v||'')

export function AdminProviderVerificationPanel(){
 const[open,setOpen]=useState(true),[rows,setRows]=useState<ProviderRow[]>([]),[docs,setDocs]=useState<ProviderDoc[]>([]),[filter,setFilter]=useState<'todos'|VerificationState>('todos'),[motives,setMotives]=useState<Record<string,string>>({}),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[expanded,setExpanded]=useState<Record<string,boolean>>({})
 const load=useCallback(async()=>{
  setMessage('')
  const[{data:profiles,error:pe},{data:users,error:ue},{data:cats,error:ce},{data:documents,error:de}]=await Promise.all([
   (supabase as any).from('perfiles_proveedor').select('usuario_id,estado_verificacion,motivo_rechazo,bio,tarifa_base,online,disponible,ciudad_base,telefono_profesional,experiencia_anos,especialidades,updated_at,categoria_principal_id').order('updated_at',{ascending:false}),
   (supabase as any).from('usuarios').select('id,nombre,apellido,email,karma,servicios_completados,activo,zona,pais,tipo'),
   (supabase as any).from('categorias').select('id,nombre,emoji'),
   (supabase as any).from('documentos').select('id,usuario_id,tipo,estado,url_storage,descripcion,notas,notas_rechazo,ocr_valido,ocr_confianza,created_at,updated_at,revisado_at').order('created_at',{ascending:false}),
  ])
  if(pe)throw pe;if(ue)throw ue;if(ce)throw ce;if(de)throw de
  const um=new Map((users||[]).map((u:any)=>[u.id,u])),cm=new Map((cats||[]).map((c:any)=>[c.id,c]))
  setRows(((profiles||[])as any[]).map(p=>({...p,usuario:um.get(p.usuario_id)||null,categoria:p.categoria_principal_id?cm.get(p.categoria_principal_id)||null:null}))as ProviderRow[])
  setDocs((documents||[])as ProviderDoc[])
 },[])

 useEffect(()=>{if(!open)return;void load().catch(e=>setMessage(e instanceof Error?e.message:'No se pudo cargar verificación.'));const ch=supabase.channel('admin-provider-verification').on('postgres_changes',{event:'*',schema:'public',table:'perfiles_proveedor'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'usuarios'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'documentos'},()=>void load()).subscribe();return()=>{void supabase.removeChannel(ch)}},[open,load])

 const docsByUser=useMemo(()=>{const out:Record<string,ProviderDoc[]>={};for(const d of docs)(out[d.usuario_id]??=[]).push(d);return out},[docs])
 const visible=useMemo(()=>filter==='todos'?rows:rows.filter(r=>r.estado_verificacion===filter),[rows,filter])
 const pending=rows.filter(r=>['registrado','pendiente'].includes(r.estado_verificacion)).length

 async function providerState(row:ProviderRow,state:VerificationState){
  const reason=(motives[row.usuario_id]||'').trim()
  if(state==='rechazado'&&reason.length<8){setMessage('Escribí un motivo de rechazo de al menos 8 caracteres.');return}
  setBusy(row.usuario_id+state);setMessage('')
  try{
   const{data:{session}}=await supabase.auth.getSession();const token=session?.access_token
   if(!token)throw new Error('La sesión Admin venció. Volvé a iniciar sesión.')
   const response=await fetch('/api/operations?op=provider-verification',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({providerId:row.usuario_id,state,reason:reason||null})})
   const payload=await response.json().catch(()=>({})) as VerificationResponse
   if(!response.ok)throw new Error(payload.error||'No se pudo actualizar el proveedor.')
   setMessage(state==='verificado'?'Proveedor verificado correctamente.':state==='rechazado'?'Proveedor rechazado con motivo registrado.':'Estado actualizado.')
   await load()
  }catch(e){setMessage(e instanceof Error?e.message:'No se pudo actualizar el proveedor.')}finally{setBusy('')}
 }

 async function signedUrl(path:string){
  for(const bucket of ['provider-kyc','documentos']){
   const{data,error}=await(supabase as any).storage.from(bucket).createSignedUrl(path,600)
   if(!error&&data?.signedUrl)return data.signedUrl as string
  }
  throw new Error('No se pudo abrir el archivo privado.')
 }

 async function openDocument(doc:ProviderDoc){
  setBusy(doc.id);setMessage('')
  try{const url=await signedUrl(doc.url_storage);window.open(url,'_blank','noopener,noreferrer')}catch(e){setMessage(e instanceof Error?e.message:'No se pudo abrir el documento.')}finally{setBusy('')}
 }

 async function documentState(doc:ProviderDoc,state:'aprobado'|'rechazado'){
  let reason:string|null=null
  if(state==='rechazado'){
   const raw=window.prompt(`Motivo de rechazo para ${docLabel(doc.tipo)} (mínimo 8 caracteres):`,'')
   if(raw===null)return
   reason=raw.trim();if(reason.length<8){setMessage('El motivo de rechazo debe tener al menos 8 caracteres.');return}
  }
  if(!window.confirm(`${state==='aprobado'?'Aprobar':'Rechazar'} ${docLabel(doc.tipo)}? La decisión queda registrada en UGO.`))return
  setBusy(doc.id);setMessage('')
  try{
   const{data:{user}}=await supabase.auth.getUser()
   const payload:any={estado:state,revisor_id:user?.id||null,revisado_at:new Date().toISOString()}
   if(state==='aprobado'){payload.notas='Aprobado después de revisión manual en Admin UGO';payload.notas_rechazo=null}
   else payload.notas_rechazo=reason
   const{error}=await(supabase as any).from('documentos').update(payload).eq('id',doc.id)
   if(error)throw error
   setMessage(state==='aprobado'?'Documento aprobado.':'Documento rechazado con motivo.')
   await load()
  }catch(e){setMessage(e instanceof Error?e.message:'No se pudo actualizar el documento.')}finally{setBusy('')}
 }

 return <>
  <button type="button" className="ugo-provider-verification-toggle" onClick={()=>setOpen(v=>!v)}>✅ {open?'Cerrar':'Abrir'} proveedores{pending>0?` (${pending})`:''}</button>
  {open&&<section className="ugo-provider-verification">
   <header><div><small>PERSONAS · KYC</small><h3>Verificación de proveedores</h3><p>Perfil, documentación enviada y decisión administrativa en una sola pantalla.</p></div><button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar">×</button></header>
   <nav aria-label="Filtros de verificación">{(['todos','registrado','pendiente','verificado','rechazado','suspendido']as const).map(x=><button type="button" key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x==='todos'?'Todos':label(x)}</button>)}</nav>
   {message&&<div className="ugo-provider-verification-message" role="status">{message}</div>}
   {!visible.length&&<div className="ugo-provider-verification-empty">No hay proveedores en este estado.</div>}
   <div className="ugo-provider-verification-list">{visible.map(r=>{const providerDocs=docsByUser[r.usuario_id]||[],received=new Set(providerDocs.map(d=>d.tipo)),complete=expected.filter(x=>received.has(x)).length,isExpanded=expanded[r.usuario_id]!==false;return <article key={r.usuario_id} className="ugo-provider-verification-card">
    <div className="ugo-provider-verification-summary"><div className="ugo-provider-verification-avatar">{(r.usuario?.nombre||'P').slice(0,1).toUpperCase()}</div><div className="ugo-provider-verification-person"><small>{r.categoria?.emoji||'🛠️'} {r.categoria?.nombre||'Sin categoría'}</small><h4>{r.usuario?.nombre||'Proveedor'} {r.usuario?.apellido||''}</h4><p>{r.usuario?.email||'Email no informado'} · {r.telefono_profesional||'Sin teléfono'}</p><div className="ugo-provider-verification-chips"><span>⭐ {Number(r.usuario?.karma||0).toFixed(1)}</span><span>{r.usuario?.servicios_completados||0} trabajos</span><span>{r.ciudad_base||r.usuario?.zona||'Sin zona'}</span><span>{r.experiencia_anos??0} años exp.</span></div></div><div className="ugo-provider-verification-state"><span className={r.estado_verificacion}>{label(r.estado_verificacion)}</span><b>{complete}/{expected.length} docs</b><button type="button" onClick={()=>setExpanded(v=>({...v,[r.usuario_id]:!isExpanded}))}>{isExpanded?'Ocultar':'Ver'} documentos</button></div></div>
    {isExpanded&&<div className="ugo-provider-docs"><header><div><small>DOCUMENTOS ENVIADOS</small><strong>{providerDocs.length?`${providerDocs.length} archivo(s) vinculados al proveedor`:'Todavía no envió documentos'}</strong></div><span>{complete===expected.length?'Paquete base completo':`${expected.length-complete} documento(s) base faltante(s)`}</span></header>
     <div className="ugo-provider-docs-grid">{expected.map(type=>{const d=providerDocs.find(x=>x.tipo===type);return <div key={type} className={d?'has-document':'missing'}><div className="ugo-provider-doc-icon">{type==='selfie'?'🙂':type.includes('identidad')?'🪪':'🏠'}</div><div><b>{docLabel(type)}</b>{d?<><span className={`doc-state ${d.estado}`}>{d.estado}</span><small>Subido {when(d.created_at)}</small>{d.ocr_confianza!=null&&<small>OCR {Math.round(Number(d.ocr_confianza)*100)}%</small>}{d.notas_rechazo&&<p>{d.notas_rechazo}</p>}</>:<small>No enviado</small>}</div>{d&&<div className="ugo-provider-doc-actions"><button type="button" onClick={()=>void openDocument(d)} disabled={busy===d.id}>{busy===d.id?'Abriendo…':'Ver'}</button><button type="button" className="approve" onClick={()=>void documentState(d,'aprobado')} disabled={busy===d.id||d.estado==='aprobado'}>Aprobar</button><button type="button" className="reject" onClick={()=>void documentState(d,'rechazado')} disabled={busy===d.id||d.estado==='rechazado'}>Rechazar</button></div>}</div>})}
      {providerDocs.filter(d=>!expected.includes(d.tipo)).map(d=><div key={d.id} className="has-document"><div className="ugo-provider-doc-icon">📄</div><div><b>{docLabel(d.tipo)}</b><span className={`doc-state ${d.estado}`}>{d.estado}</span><small>Subido {when(d.created_at)}</small></div><div className="ugo-provider-doc-actions"><button type="button" onClick={()=>void openDocument(d)} disabled={busy===d.id}>Ver</button><button type="button" className="approve" onClick={()=>void documentState(d,'aprobado')} disabled={busy===d.id||d.estado==='aprobado'}>Aprobar</button><button type="button" className="reject" onClick={()=>void documentState(d,'rechazado')} disabled={busy===d.id||d.estado==='rechazado'}>Rechazar</button></div></div>)}
     </div>
    </div>}
    <div className="ugo-provider-verification-details"><div><small>Especialidad</small><b>{specialText(r.especialidades)||r.categoria?.nombre||'—'}</b></div><div><small>Bio</small><b>{r.bio||'Sin bio'}</b></div><div><small>Actualizado</small><b>{when(r.updated_at)}</b></div></div>
    <label className="ugo-provider-reject-reason"><span>Motivo del rechazo general <em>sólo obligatorio al rechazar proveedor</em></span><textarea value={motives[r.usuario_id]||''} onChange={e=>setMotives(v=>({...v,[r.usuario_id]:e.target.value}))} placeholder="Ej.: Documento ilegible o datos que no coinciden…"/></label>
    <div className="ugo-provider-verification-actions"><button type="button" className="verify" disabled={!!busy} onClick={()=>void providerState(r,'verificado')}>✓ Verificar proveedor</button><button type="button" className="reject" disabled={!!busy} onClick={()=>void providerState(r,'rechazado')}>Rechazar</button><button type="button" disabled={!!busy} onClick={()=>void providerState(r,'pendiente')}>Dejar pendiente</button><button type="button" disabled={!!busy} onClick={()=>void providerState(r,'suspendido')}>Suspender</button></div>
   </article>})}</div>
   <footer>La verificación general no inventa identidad: Admin ve los archivos privados enviados, revisa cada documento y registra la decisión.</footer>
  </section>}
 </>
}
