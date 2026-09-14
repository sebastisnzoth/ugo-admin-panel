import React,{useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'

type Category={id:string;nombre:string;emoji:string;slug:string}
type ProviderCategory={categoria_id:string;es_principal:boolean;activa:boolean}

export function ProviderCategoriesEditor({primaryId,onSaved}:{primaryId:string|null;onSaved?:()=>void|Promise<void>}){
 const sb=useMemo(()=>getRoleSupabase('provider'),[])
 const[categories,setCategories]=useState<Category[]>([]),[selected,setSelected]=useState<string[]>(primaryId?[primaryId]:[]),[primary,setPrimary]=useState(primaryId||''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{let alive=true;(async()=>{setLoading(true);setMessage('');try{const{data:auth,error:authError}=await sb.auth.getUser();if(authError)throw authError;if(!auth.user)throw new Error('Sesión de proveedor requerida.');const[{data:cats,error:catsError},{data:rows,error:rowsError}]=await Promise.all([sb.from('categorias').select('id,nombre,emoji,slug').eq('activa',true).order('nombre'),sb.from('proveedor_categorias').select('categoria_id,es_principal,activa').eq('proveedor_id',auth.user.id).eq('activa',true)]);if(catsError)throw catsError;if(rowsError)throw rowsError;if(!alive)return;const list=(cats||[])as Category[],enabled=(rows||[])as ProviderCategory[];const persistedPrimary=enabled.find(row=>row.es_principal)?.categoria_id||primaryId||'';const ids=Array.from(new Set([...enabled.map(row=>row.categoria_id),...(persistedPrimary?[persistedPrimary]:[])]));setCategories(list);setPrimary(persistedPrimary);setSelected(ids)}catch(error){if(alive)setMessage(error instanceof Error?error.message:'No pudimos cargar tus rubros.')}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[primaryId,sb])
 const toggle=(id:string)=>{if(id===primary)return;setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}
 const changePrimary=(id:string)=>{setPrimary(id);setSelected(current=>Array.from(new Set([...current,id]))) }
 const save=async()=>{if(!primary){setMessage('Elegí tu rubro principal.');return}setBusy(true);setMessage('');try{const ids=Array.from(new Set([...selected,primary]));const{error}=await sb.rpc('guardar_categorias_proveedor',{p_categoria_principal_id:primary,p_categorias:ids});if(error)throw error;setSelected(ids);setMessage('Rubros actualizados. Ya podés recibir pedidos compatibles con cualquiera de ellos.');await onSaved?.()}catch(error){setMessage(error instanceof Error?error.message:'No pudimos guardar tus rubros.')}finally{setBusy(false)}}
 if(loading)return <p>Cargando tus rubros…</p>
 return <div className="provider-categories-editor">
  <label>Rubro principal<select value={primary} onChange={event=>changePrimary(event.target.value)}><option value="">Elegir rubro…</option>{categories.map(category=><option key={category.id} value={category.id}>{category.emoji} {category.nombre}</option>)}</select></label>
  <div className="provider-profile-fields" aria-label="Otros rubros que realizás">{categories.map(category=>{const checked=selected.includes(category.id);return <label key={category.id}><span>{category.emoji} {category.nombre}{category.id===primary?' · principal':''}</span><input type="checkbox" checked={checked} disabled={category.id===primary||busy} onChange={()=>toggle(category.id)}/></label>})}</div>
  <small>Podés trabajar en varios rubros con una sola cuenta. El principal se usa para presentar tu perfil; todos los seleccionados entran al matching.</small>
  {message&&<p className="provider-profile-error" role="status">{message}</p>}
  <button className="provider-primary provider-wide" type="button" disabled={busy||!primary} onClick={()=>void save()}>{busy?'Guardando…':'Guardar rubros'}</button>
 </div>
}
