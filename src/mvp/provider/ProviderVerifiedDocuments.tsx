import React,{useEffect,useState}from'react'
import{useLocale}from'../../i18n/locale'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{Button}from'../../shared/ui'

type VerifiedDocument={id:string;tipo:string;revisado_at:string|null}
const documentKeys:Record<string,string>={identidad_frente:'providerOnboarding.documentFront',identidad_dorso:'providerOnboarding.documentBack',selfie:'providerOnboarding.selfie',comprobante_domicilio:'providerOnboarding.proofAddress'}

/** Read only the current provider's approved metadata; document files remain private. */
export function ProviderVerifiedDocuments(){
 const{t,locale}=useLocale()
 const[documents,setDocuments]=useState<VerifiedDocument[]>([]),[state,setState]=useState<'loading'|'error'|'ready'>('loading'),[attempt,setAttempt]=useState(0)
 useEffect(()=>{
  let alive=true
  const load=async()=>{
   try{
    const db=getRoleSupabase('provider'),{data:auth,error:authError}=await db.auth.getUser()
    if(authError||!auth.user)throw new Error('Session unavailable')
    const{data,error}=await db.from('documentos').select('id,tipo,revisado_at').eq('usuario_id',auth.user.id).eq('estado','aprobado').order('revisado_at',{ascending:false})
    if(error)throw error
    if(alive){setDocuments((data||[]) as VerifiedDocument[]);setState('ready')}
   }catch{if(alive)setState('error')}
  }
  void load()
  return()=>{alive=false}
 },[attempt])
 const retry=()=>{setState('loading');setAttempt(value=>value+1)}
 return <section className="provider-verified-documents" aria-label={t('providerDocuments.title')}>
  <h3>{t('providerDocuments.title')}</h3>
  {state==='loading'&&<p role="status">{t('providerDocuments.loading')}</p>}
  {state==='error'&&<div role="alert"><p>{t('providerDocuments.error')}</p><Button type="button" variant="secondary" onClick={retry}>{t('providerDocuments.retry')}</Button></div>}
  {state==='ready'&&(documents.length?<ul>{documents.map(doc=>{const reviewed=doc.revisado_at?new Date(doc.revisado_at):null;return <li key={doc.id}><span className="provider-verified-document-icon" aria-hidden="true">✓</span><div><strong>{documentKeys[doc.tipo]?t(documentKeys[doc.tipo]):doc.tipo.replaceAll('_',' ')}</strong><span>{t('status.aprobado')}</span>{reviewed&&Number.isFinite(reviewed.getTime())&&<small>{t('providerDocuments.reviewed',{date:reviewed.toLocaleDateString(locale)})}</small>}</div></li>})}</ul>:<p>{t('providerDocuments.empty')}</p>)}
 </section>
}
