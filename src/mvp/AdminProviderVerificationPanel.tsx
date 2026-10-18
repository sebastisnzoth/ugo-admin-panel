import{useLocale,LocalizedText}from'../i18n/locale'
import React,{useCallback,useEffect,useMemo,useState}from'react'
import{subscribeRealtimeChannel}from'../lib/realtimeChannel'
import{supabase}from'../lib/supabase'
import{useDialog}from'./dialogs'
import{AdminUsersPanel}from'./AdminUsersPanel'
import'./admin-provider-verification.css'

type VerificationState='registrado'|'pendiente'|'verificado'|'rechazado'|'suspendido'
type ProviderRow={usuario_id:string;estado_verificacion:VerificationState;motivo_rechazo:string|null;bio:string|null;tarifa_base:number|string|null;online:boolean;disponible:boolean;ciudad_base:string|null;telefono_profesional:string|null;experiencia_anos:number|null;especialidades:any;updated_at:string;categoria_principal_id:string|null;usuario?:{nombre:string;apellido:string|null;email:string|null;karma:number;servicios_completados:number;activo:boolean;es_demo:boolean|null;zona:string|null;pais:string|null}|null;categoria?:{nombre:string;emoji:string}|null}
type ProviderDoc={id:string;usuario_id:string;tipo:string;estado:string;url_storage:string;descripcion:string|null;notas:string|null;notas_rechazo:string|null;ocr_valido:boolean|null;ocr_confianza:number|null;created_at:string;updated_at:string|null;revisado_at:string|null}
type VerificationResponse={error?:string;success?:boolean}

const OPERATIONS_ORIGIN='https://ugo-admin-panel.vercel.app'
const operationsUrl=(op:string)=>`${window.location.hostname.endsWith('github.io')?OPERATIONS_ORIGIN:''}/api/operations?op=${encodeURIComponent(op)}`
const expected=['identidad_frente','identidad_dorso','selfie','comprobante_domicilio']
const label=(s:VerificationState,locale:'pt-BR'|'es'|'en')=>({
 'pt-BR':{registrado:'Cadastrado',pendiente:'Pendente',verificado:'Verificado',rechazado:'Rejeitado',suspendido:'Suspenso'},
 es:{registrado:'Registrado',pendiente:'Pendiente',verificado:'Verificado',rechazado:'Rechazado',suspendido:'Suspendido'},
 en:{registrado:'Registered',pendiente:'Pending',verificado:'Verified',rechazado:'Rejected',suspendido:'Suspended'},
}[locale][s])
const docLabel=(s:string)=>({identidad_frente:'Identidad · frente',identidad_dorso:'Identidad · dorso',selfie:'Selfie',comprobante_domicilio:'Comprobante de domicilio'} as Record<string,string>)[s]||s.replaceAll('_',' ')
const when=(v?:string|null)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const specialText=(v:any)=>Array.isArray(v)?v.join(', '):v&&typeof v==='object'?JSON.stringify(v):String(v||'')

export function AdminProviderVerificationPanel(){
 const{t,locale}=useLocale();
 const[accountFilter,setAccountFilter]=useState<'todos'|'demo'|'reales'>('todos'),[search,setSearch]=useState('')
 const[editProviderId,setEditProviderId]=useState<string|null>(null),[open,setOpen]=useState(true),[rows,setRows]=useState<ProviderRow[]>([]),[docs,setDocs]=useState<ProviderDoc[]>([]),[filter,setFilter]=useState<'todos'|VerificationState>('todos'),[motives,setMotives]=useState<Record<string,string>>({}),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[expanded,setExpanded]=useState<Record<string,boolean>>({})
 const{confirm,prompt,node:dialog}=useDialog()
 const load=useCallback(async()=>{
  setMessage('')
  const[{data:profiles,error:pe},{data:users,error:ue},{data:cats,error:ce},{data:documents,error:de}]=await Promise.all([
   (supabase as any).from('perfiles_proveedor').select('usuario_id,estado_verificacion,motivo_rechazo,bio,tarifa_base,online,disponible,ciudad_base,telefono_profesional,experiencia_anos,especialidades,updated_at,categoria_principal_id').order('updated_at',{ascending:false}),
   (supabase as any).from('usuarios').select('id,nombre,apellido,email,karma,servicios_completados,activo,es_demo,zona,pais,tipo'),
   (supabase as any).from('categorias').select('id,nombre,emoji'),
   (supabase as any).from('documentos').select('id,usuario_id,tipo,estado,url_storage,descripcion,notas,notas_rechazo,ocr_valido,ocr_confianza,created_at,updated_at,revisado_at').order('created_at',{ascending:false}),
  ])
  if(pe)throw pe;if(ue)throw ue;if(ce)throw ce;if(de)throw de
  const um=new Map((users||[]).map((u:any)=>[u.id,u])),cm=new Map((cats||[]).map((c:any)=>[c.id,c]))
  setRows(((profiles||[])as any[]).map(p=>({...p,usuario:um.get(p.usuario_id)||null,categoria:p.categoria_principal_id?cm.get(p.categoria_principal_id)||null:null}))as ProviderRow[])
  setDocs((documents||[])as ProviderDoc[])
 },[])

 const[channelEpoch,setChannelEpoch]=useState(0)
 useEffect(()=>{if(!open)return;void load().catch(e=>setMessage(e instanceof Error?e.message:'No se pudo cargar verificación.'));const ch=supabase.channel('admin-provider-verification').on('postgres_changes',{event:'*',schema:'public',table:'perfiles_proveedor'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'usuarios'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'documentos'},()=>void load());const dispose=subscribeRealtimeChannel(ch,supabase,{onSync:()=>void load(),onReconnect:()=>setChannelEpoch(v=>v+1)});return()=>{dispose()}},[open,load,channelEpoch])

 const docsByUser=useMemo(()=>{const out:Record<string,ProviderDoc[]>={};for(const d of docs)(out[d.usuario_id]??=[]).push(d);return out},[docs])
 const visible=useMemo(()=>rows.filter(r=>(filter==='todos'||r.estado_verificacion===filter)&&(accountFilter==='todos'||(accountFilter==='demo'?r.usuario?.es_demo===true:r.usuario?.es_demo!==true))&&(!search.trim()||[r.usuario?.nombre,r.usuario?.apellido,r.usuario?.email,r.telefono_profesional].some(v=>String(v||'').toLowerCase().includes(search.trim().toLowerCase())))),[rows,filter,accountFilter,search])
 const pending=rows.filter(r=>['registrado','pendiente'].includes(r.estado_verificacion)).length

 async function providerState(row:ProviderRow,state:VerificationState){
  const reason=(motives[row.usuario_id]||'').trim()
  if(state==='rechazado'&&reason.length<8){setMessage('Escribí un motivo de rechazo de al menos 8 caracteres.');return}
  setBusy(row.usuario_id+state);setMessage('')
  try{
   const{data:{session}}=await supabase.auth.getSession();const token=session?.access_token
   if(!token)throw new Error('La sesión Admin venció. Volvé a iniciar sesión.')
   const response=await fetch(operationsUrl('provider-verification'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({providerId:row.usuario_id,state,reason:reason||null})})
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
   const raw=await prompt({title:'Rechazar documento',message:`Motivo de rechazo para ${docLabel(doc.tipo)} (mínimo 8 caracteres):`,label:'Motivo de rechazo',required:true})
   if(raw===null)return
   reason=raw.trim();if(reason.length<8){setMessage('El motivo de rechazo debe tener al menos 8 caracteres.');return}
  }
  if(!await confirm({title:state==='aprobado'?'Aprobar documento':'Rechazar documento',message:`${state==='aprobado'?'Aprobar':'Rechazar'} ${docLabel(doc.tipo)}? La decisión queda registrada en UGO.`,danger:state==='rechazado'}))return
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
  <button type="button" className="ugo-provider-verification-toggle" onClick={()=>setOpen(v=>!v)}>✅ {open?t('verification.close'):t('verification.open')} {t('verification.providers')}{pending>0?` (${pending})`:''}</button>
  {open&&<section className="ugo-provider-verification">
   <header><div><small>{t('screen.admin_verification.1')}</small><h3>{t('screen.admin_verification.2')}</h3><p>{t('screen.admin_verification.3')}</p></div><button type="button" onClick={()=>setOpen(false)} aria-label={t('verification.close')}>×</button></header>
   <nav aria-label={t('verification.filters')}>{(['todos','registrado','pendiente','verificado','rechazado','suspendido']as const).map(x=><button type="button" key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x==='todos'?t('verification.all'):label(x,locale)}</button>)}</nav>
   <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',margin:'10px 0'}}><label style={{display:'grid',gap:4,flex:'1 1 220px'}}>Buscar proveedor<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre, correo o teléfono"/></label><label style={{display:'grid',gap:4}}>Tipo de cuenta<select value={accountFilter} onChange={e=>setAccountFilter(e.target.value as typeof accountFilter)}><option value="todos">Todas</option><option value="reales">Reales</option><option value="demo">Demo</option></select></label></div><div role="status" style={{fontSize:12,marginBottom:12}}>{visible.length} / {rows.length} · Demo: {rows.filter(r=>r.usuario?.es_demo===true).length} · Reales: {rows.filter(r=>r.usuario?.es_demo!==true).length}</div>
    {message&&<div className="ugo-provider-verification-message" role="status">{message}</div>}
   {!visible.length&&<div className="ugo-provider-verification-empty">{t('screen.admin_verification.4')}</div>}
   <div className="ugo-provider-verification-list">{visible.map(r=>{const providerDocs=docsByUser[r.usuario_id]||[],received=new Set(providerDocs.map(d=>d.tipo)),complete=expected.filter(x=>received.has(x)).length,isExpanded=expanded[r.usuario_id]!==false;return <article key={r.usuario_id} className="ugo-provider-verification-card">
    <div className="ugo-provider-verification-summary"><div className="ugo-provider-verification-avatar">{(r.usuario?.nombre||'P').slice(0,1).toUpperCase()}</div><div className="ugo-provider-verification-person"><small>{r.categoria?.emoji||'🛠️'} {r.categoria?.nombre||t('verification.noCategory')}</small><h4>{r.usuario?.nombre||t('verification.provider')} {r.usuario?.apellido||''}</h4>{r.usuario?.es_demo===true&&<strong style={{display:'inline-block',padding:'5px 8px',background:'#fff4d6',color:'#845900',borderRadius:8,fontSize:11,margin:'4px 0'}}>DEMO — NO VERIFICACIÓN REAL</strong>}<p>{r.usuario?.email||t('verification.noEmail')} · {r.telefono_profesional||t('verification.noPhone')}</p><div className="ugo-provider-verification-chips"><span>⭐ {Number(r.usuario?.karma||0).toFixed(1)}</span><span>{r.usuario?.servicios_completados||0} {t('verification.jobs')}</span><span>{r.ciudad_base||r.usuario?.zona||t('verification.noZone')}</span><span>{r.experiencia_anos??0} {t('verification.years')}</span></div></div><div className="ugo-provider-verification-state"><span className={r.estado_verificacion}>{label(r.estado_verificacion,locale)}{r.usuario?.es_demo===true?' (DEMO)':''}</span><b>{complete}/{expected.length} {t('verification.docs')}</b><button type="button" onClick={()=>setExpanded(v=>({...v,[r.usuario_id]:!isExpanded}))}>{isExpanded?t('verification.hide'):t('verification.view')} {t('verification.documents')}</button></div></div>
    {isExpanded&&<div className="ugo-provider-docs"><header><div><small>{t('screen.admin_verification.5')}</small><strong>{providerDocs.length?`${providerDocs.length} archivo(s) vinculados al proveedor`:t("uiCopy.expression107")}</strong></div><span>{complete===expected.length?t("uiCopy.expression108"):`${expected.length-complete} documento(s) base faltante(s)`}</span></header>
     <div className="ugo-provider-docs-grid">{expected.map(type=>{const d=providerDocs.find(x=>x.tipo===type);return <div key={type} className={d?'has-document':'missing'}><div className="ugo-provider-doc-icon">{type==='selfie'?'🙂':type.includes('identidad')?'🪪':'🏠'}</div><div><b>{docLabel(type)}</b>{d?<><span className={`doc-state ${d.estado}`}>{d.estado}</span><small>{t('verification.uploaded')} {when(d.created_at)}</small>{d.ocr_confianza!=null&&<small>{t('verification.ocr')} {Math.round(Number(d.ocr_confianza)*100)}%</small>}{d.notas_rechazo&&<p>{d.notas_rechazo}</p>}</>:<small>{t('screen.admin_verification.6')}</small>}</div>{d&&<div className="ugo-provider-doc-actions"><button type="button" onClick={()=>void openDocument(d)} disabled={busy===d.id}>{busy===d.id?t('verification.opening'):t('verification.view')}</button><button type="button" className="approve" onClick={()=>void documentState(d,'aprobado')} disabled={busy===d.id||d.estado==='aprobado'}>{t('screen.admin_verification.7')}</button><button type="button" className="reject" onClick={()=>void documentState(d,'rechazado')} disabled={busy===d.id||d.estado==='rechazado'}>{t('screen.admin_verification.8')}</button></div>}</div>})}
      {providerDocs.filter(d=>!expected.includes(d.tipo)).map(d=><div key={d.id} className="has-document"><div className="ugo-provider-doc-icon">📄</div><div><b>{docLabel(d.tipo)}</b><span className={`doc-state ${d.estado}`}>{d.estado}</span><small><LocalizedText id="verification.uploaded"/> {when(d.created_at)}</small></div><div className="ugo-provider-doc-actions"><button type="button" onClick={()=>void openDocument(d)} disabled={busy===d.id}>{t('screen.admin_verification.9')}</button><button type="button" className="approve" onClick={()=>void documentState(d,'aprobado')} disabled={busy===d.id||d.estado==='aprobado'}>{t('screen.admin_verification.7')}</button><button type="button" className="reject" onClick={()=>void documentState(d,'rechazado')} disabled={busy===d.id||d.estado==='rechazado'}>{t('screen.admin_verification.8')}</button></div></div>)}
     </div>
    </div>}
    <div className="ugo-provider-verification-details"><div><small>{t('screen.admin_verification.10')}</small><b>{specialText(r.especialidades)||r.categoria?.nombre||'—'}</b></div><div><small>{t('screen.admin_verification.11')}</small><b>{r.bio||t("uiCopy.expression109")}</b></div><div><small>{t('screen.admin_verification.12')}</small><b>{when(r.updated_at)}</b></div></div>
    <label className="ugo-provider-reject-reason"><span>{t('verification.rejectTitle')} <em>{t('screen.admin_verification.14')}</em></span><textarea value={motives[r.usuario_id]||''} onChange={e=>setMotives(v=>({...v,[r.usuario_id]:e.target.value}))} placeholder={t('verification.rejectPlaceholder')}/></label>
    <div className="ugo-provider-verification-actions"><button type="button" onClick={()=>setEditProviderId(r.usuario_id)} disabled={!!busy}>{t('ugoUserEdit.edit')}</button><button type="button" className="verify" disabled={!!busy||r.usuario?.es_demo===true} onClick={()=>void providerState(r,'verificado')}>{t('screen.admin_verification.15')}</button><button type="button" className="reject" disabled={!!busy} onClick={()=>void providerState(r,'rechazado')}>{t('screen.admin_verification.8')}</button><button type="button" disabled={!!busy} onClick={()=>void providerState(r,'pendiente')}>{t('screen.admin_verification.16')}</button><button type="button" disabled={!!busy} onClick={()=>void providerState(r,'suspendido')}>{t('screen.admin_verification.17')}</button></div>
   </article>})}</div>
   <footer>{t('verification.policy')}</footer>
  </section>}
 {editProviderId&&<div role="dialog" aria-modal="true" aria-label={t('ugoUserEdit.editUser')} className="ugo-verification-edit-backdrop"><section className="ugo-verification-edit-panel"><div className="ugo-verification-edit-heading"><strong>{t('ugoUserEdit.editUser')}</strong><button type="button" onClick={()=>{setEditProviderId(null);void load().catch(e=>setMessage(e instanceof Error?e.message:'Failed to load'))}} aria-label={t('ugoUserEdit.cancel')}>×</button></div><AdminUsersPanel key={editProviderId} initialEditUserId={editProviderId} initialFilter="proveedor" embedded/></section></div>}
 {dialog}
 </>
}
