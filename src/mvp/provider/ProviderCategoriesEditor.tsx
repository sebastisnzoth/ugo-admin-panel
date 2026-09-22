import React,{useEffect,useState}from'react'
import{Button,LoadingState,Select}from'../../shared/ui'
import{loadProviderCategories,saveProviderCategories,type ProviderCategory as Category}from'../../features/provider/services/providerCategoriesService'

export function ProviderCategoriesEditor({primaryId,onSaved}:{primaryId:string|null;onSaved?:()=>void|Promise<void>}){
 const[categories,setCategories]=useState<Category[]>([]),[selected,setSelected]=useState<string[]>(primaryId?[primaryId]:[]),[primary,setPrimary]=useState(primaryId||''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{let alive=true;(async()=>{setLoading(true);setMessage('');try{const result=await loadProviderCategories(primaryId);if(!alive)return;setCategories(result.categories);setPrimary(result.primary);setSelected(result.selected);if(result.categories.length===0)setMessage('UGO no tiene rubros activos configurados.')}catch(error){if(alive)setMessage(error instanceof Error?error.message:'No pudimos cargar tus rubros.')}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[primaryId])
 const toggle=(id:string)=>{if(id===primary)return;setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}
 const changePrimary=(id:string)=>{setPrimary(id);setSelected(current=>Array.from(new Set([...current,id]))) }
 const save=async()=>{if(!primary){setMessage('Elegí tu rubro principal.');return}setBusy(true);setMessage('');try{const persisted=await saveProviderCategories(primary,selected);setSelected(persisted);setMessage('Rubros actualizados. Ya podés recibir pedidos compatibles con cualquiera de ellos.');await onSaved?.()}catch(error){setMessage(error instanceof Error?error.message:'No pudimos guardar tus rubros.')}finally{setBusy(false)}}
 if(loading)return <LoadingState label="Cargando tus rubros…"/>
 return <div className="provider-categories-editor">
  <label>Rubro principal<Select value={primary} onChange={event=>changePrimary(event.target.value)} disabled={busy||categories.length===0}><option value="">Elegir rubro…</option>{categories.map(category=><option key={category.id} value={category.id}>{category.emoji} {category.nombre}</option>)}</Select></label>
  <div className="provider-profile-fields" aria-label="Otros rubros que realizás">{categories.map(category=>{const checked=selected.includes(category.id);return <label key={category.id}><span>{category.emoji} {category.nombre}{category.id===primary?' · principal':''}</span><input type="checkbox" checked={checked} disabled={category.id===primary||busy} onChange={()=>toggle(category.id)}/></label>})}</div>
  <small>Podés trabajar en varios rubros con una sola cuenta. El principal se usa para presentar tu perfil; todos los seleccionados entran al matching.</small>
  {message&&<p className="provider-profile-error" role="status">{message}</p>}
  <Button variant="primary" className="provider-primary provider-wide" disabled={busy||!primary||categories.length===0} onClick={()=>void save()}>{busy?'Guardando…':'Guardar rubros'}</Button>
 </div>
}
