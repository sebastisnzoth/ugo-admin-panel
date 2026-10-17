import{useLocale}from'../../i18n/locale'
import React,{useEffect,useState}from'react'
import{Button,LoadingState,Select}from'../../shared/ui'
import{loadProviderCategories,saveProviderCategories,type ProviderCategory as Category}from'../../features/provider/services/providerCategoriesService'

export function ProviderCategoriesEditor({primaryId,onSaved}:{primaryId:string|null;onSaved?:()=>void|Promise<void>}){
 const{t}=useLocale();
 const[categories,setCategories]=useState<Category[]>([]),[selected,setSelected]=useState<string[]>(primaryId?[primaryId]:[]),[primary,setPrimary]=useState(primaryId||''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{let alive=true;(async()=>{setLoading(true);setMessage('');try{const result=await loadProviderCategories(primaryId);if(!alive)return;setCategories(result.categories);setPrimary(result.primary);setSelected(result.selected);if(result.categories.length===0)setMessage(t('providerCategories.empty'))}catch(error){if(alive)setMessage(error instanceof Error?error.message:t('providerCategories.loadFailed'))}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[primaryId,t])
 const toggle=(id:string)=>{if(id===primary)return;setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}
 const changePrimary=(id:string)=>{setPrimary(id);setSelected(current=>Array.from(new Set([...current,id]))) }
 const save=async()=>{if(!primary){setMessage(t('providerCategories.choosePrimary'));return}setBusy(true);setMessage('');try{const persisted=await saveProviderCategories(primary,selected);setSelected(persisted);setMessage(t('providerCategories.saved'));await onSaved?.()}catch(error){setMessage(error instanceof Error?error.message:t('providerCategories.saveFailed'))}finally{setBusy(false)}}
 if(loading)return <LoadingState label={t('providerCategories.loading')}/>
 return <div className="provider-categories-editor">
  <label>{t('screen.provider_categories.1')}<Select value={primary} onChange={event=>changePrimary(event.target.value)} disabled={busy||categories.length===0}><option value="">{t('screen.provider_categories.2')}</option>{categories.map(category=><option key={category.id} value={category.id}>{category.emoji} {category.nombre}</option>)}</Select></label>
  <div className="provider-profile-fields" aria-label={t('providerCategories.other')}>{categories.map(category=>{const checked=selected.includes(category.id);return <label key={category.id}><span>{category.emoji} {category.nombre}{category.id===primary?' · '+t('providerCategories.primary'):''}</span><input type="checkbox" checked={checked} disabled={category.id===primary||busy} onChange={()=>toggle(category.id)}/></label>})}</div>
  <small>{t('providerCategories.help')}</small>
  {message&&<p className="provider-profile-error" role="status">{message}</p>}
  <Button variant="primary" className="provider-primary provider-wide" disabled={busy||!primary||categories.length===0} onClick={()=>void save()}>{busy?t('providerCategories.saving'):t('providerCategories.save')}</Button>
 </div>
}
