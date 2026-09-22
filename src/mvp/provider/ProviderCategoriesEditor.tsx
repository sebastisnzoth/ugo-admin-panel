import React,{useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{Button,LoadingState,Select}from'../../shared/ui'

type Category={id:string;nombre:string;emoji:string;slug:string}

export function ProviderCategoriesEditor({primaryId,onSaved}:{primaryId:string|null;onSaved?:()=>void|Promise<void>}){
 const sb=useMemo(()=>getRoleSupabase('provider'),[])
 const[categories,setCategories]=useState<Category[]>([]),[selected,setSelected]=useState<string[]>(primaryId?[primaryId]:[]),[primary,setPrimary]=useState(primaryId||''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{let alive=true;(async()=>{setLoading(true);setMessage('');try{const{data:auth,error:authError}=await sb.auth.getUser();if(authError)throw authError;if(!auth.user)throw new Error('Sesión de proveedor requerida.');const[{data:cats,error:catsError},{data:userRow,error:userError}]=await Promise.all([sb.from('categorias').select('id,nombre,emoji,slug').eq('activa',true).order('nombre'),sb.from('usuarios').select('categorias_ids').eq('id',auth.user.id).maybeSingle()]);if(catsError)throw catsError;if(userError)throw userError;if(!alive)return;const list=(cats||[])as Category[],stored=Array.isArray(userRow?.categorias_ids)?userRow.categorias_ids.filter((id):id is string=>typeof id==='string'):[];const valid=new Set(list.map(category=>category.id));const persistedPrimary=primaryId&&valid.has(primaryId)?primaryId:'';const ids=Array.from(new Set([...stored.filter(id=>valid.has(id)),...(persistedPrimary?[persistedPrimary]:[])]));setCategories(list);setPrimary(persistedPrimary);setSelected(ids);if(list.length===0)setMessage('UGO no tiene rubros activos configurados.') }catch(error){if(alive)setMessage(error instanceof Error?error.message:'No pudimos cargar tus rubros.')}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[primaryId,sb])
 const toggle=(id:string)=>{if(id===primary)return;setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}
 const changePrimary=(id:string)=>{setPrimary(id);setSelected(current=>Array.from(new Set([...current,id]))) }
 const save=async()=>{if(!primary){setMessage('Elegí tu rubro principal.');return}setBusy(true);setMessage('');try{const ids=Array.from(new Set([...selected,primary]));const{data,error}=await sb.rpc('guardar_categorias_proveedor',{p_categoria_principal_id:primary,p_categorias:ids});if(error)throw error;const persisted=Array.isArray(data)?data.filter((id):id is string=>typeof id==='string'):ids;setSelected(persisted);setMessage('Rubros actualizados. Ya podés recibir pedidos compatibles con cualquiera de ellos.');await onSaved?.()}catch(error){setMessage(error instanceof Error?error.message:'No pudimos guardar tus rubros.')}finally{setBusy(false)}}
 if(loading)return <LoadingState label="Cargando tus rubros…"/>
 return <div className="provider-categories-editor">
  <label>Rubro principal<Select value={primary} onChange={event=>changePrimary(event.target.value)} disabled={busy||categories.length===0}><option value="">Elegir rubro…</option>{categories.map(category=><option key={category.id} value={category.id}>{category.emoji} {category.nombre}</option>)}</Select></label>
  <div className="provider-profile-fields" aria-label="Otros rubros que realizás">{categories.map(category=>{const checked=selected.includes(category.id);return <label key={category.id}><span>{category.emoji} {category.nombre}{category.id===primary?' · principal':''}</span><input type="checkbox" checked={checked} disabled={category.id===primary||busy} onChange={()=>toggle(category.id)}/></label>})}</div>
  <small>Podés trabajar en varios rubros con una sola cuenta. El principal se usa para presentar tu perfil; todos los seleccionados entran al matching.</small>
  {message&&<p className="provider-profile-error" role="status">{message}</p>}
  <Button variant="primary" className="provider-primary provider-wide" disabled={busy||!primary||categories.length===0} onClick={()=>void save()}>{busy?'Guardando…':'Guardar rubros'}</Button>
 </div>
}
