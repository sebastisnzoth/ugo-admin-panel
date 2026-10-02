import React,{useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{Button,Input,Textarea}from'../../shared/ui'

type Capabilities={products?:string;equipment?:string;restrictions?:string;tools?:string;transport?:string;materials?:string;quoteMode?:string;workLimits?:string;certifications?:string}
type Ref={id?:string;nombre:string;relacion:string;contacto:string;autorizado_contacto:boolean}
const blankRef=():Ref=>({nombre:'',relacion:'',contacto:'',autorizado_contacto:false})
const normalize=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')

export function ProviderPilotCapabilities({providerId,categoryId,initial}:{providerId:string;categoryId:string|null;initial?:Capabilities|null}){
 const sb=useMemo(()=>getRoleSupabase('provider'),[])
 const[category,setCategory]=useState(''),[caps,setCaps]=useState<Capabilities>(initial||{}),[refs,setRefs]=useState<Ref[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{setCaps(initial||{})},[initial])
 useEffect(()=>{let live=true;void Promise.all([
  categoryId?sb.from('categorias').select('nombre,slug').eq('id',categoryId).maybeSingle():Promise.resolve({data:null,error:null}),
  (sb as any).from('proveedor_referencias_laborales').select('id,nombre,relacion,contacto,autorizado_contacto').eq('proveedor_id',providerId).order('created_at').limit(2)
 ]).then(([c,r]:any)=>{if(!live)return;setCategory(String(c.data?.slug||c.data?.nombre||''));setRefs((r.data||[]) as Ref[])});return()=>{live=false}},[categoryId,providerId,sb])
 const kind=/faxina|limpeza|diarista/.test(normalize(category))?'faxina':/marido|reparac|manutenc|faz.?tudo/.test(normalize(category))?'marido':null
 if(!kind)return null
 const field=(key:keyof Capabilities,label:string,placeholder:string)=><label className="ugo-provider-field">{label}<Textarea value={caps[key]||''} onChange={e=>setCaps(v=>({...v,[key]:e.target.value}))} placeholder={placeholder}/></label>
 const setRef=(index:number,key:keyof Ref,value:string|boolean)=>setRefs(current=>{const next=[...current];while(next.length<=index)next.push(blankRef());next[index]={...next[index],[key]:value};return next})
 const save=async()=>{setBusy(true);setMessage('');try{
  const required=kind==='faxina'
   ? Boolean(caps.products?.trim()&&caps.equipment?.trim()&&caps.restrictions?.trim())
   : Boolean(caps.tools?.trim()&&caps.transport?.trim()&&caps.materials?.trim()&&caps.quoteMode?.trim()&&caps.workLimits?.trim())
  if(!required)throw new Error('Completá la configuración operativa obligatoria antes de guardar.')
  const{error:profileError}=await(supabase=>supabase.from('perfiles_proveedor').update({pilot_capabilities:caps}).eq('usuario_id',providerId))(sb as any);if(profileError)throw profileError
  const clean=refs.slice(0,2).filter(r=>r.nombre.trim()||r.contacto.trim())
  for(const r of clean){if(!r.nombre.trim()||!r.relacion.trim()||!r.contacto.trim()||!r.autorizado_contacto)throw new Error('Cada referencia debe tener nombre, relación, contacto y autorización.')}
  const{error:deleteError}=await(sb as any).from('proveedor_referencias_laborales').delete().eq('proveedor_id',providerId);if(deleteError)throw deleteError
  if(clean.length){const{error:insertError}=await(sb as any).from('proveedor_referencias_laborales').insert(clean.map(r=>({proveedor_id:providerId,nombre:r.nombre.trim(),relacion:r.relacion.trim(),contacto:r.contacto.trim(),autorizado_contacto:true})));if(insertError)throw insertError}
  setMessage('Configuración del piloto guardada.')
 }catch(e){setMessage(e instanceof Error?e.message:'No se pudo guardar la configuración del piloto.')}finally{setBusy(false)}}
 return <div className="provider-setting-content"><p><strong>{kind==='faxina'?'Faxina':'Marido de Aluguel'} · configuración del piloto</strong></p>
  {kind==='faxina'?<>{field('products','Productos de limpieza','Qué llevás y qué debe aportar el cliente.')}{field('equipment','Equipamiento','Aspiradora, escalera, paños u otro equipamiento.')}{field('restrictions','Restricciones','Qué trabajos o condiciones no aceptás.')}</>:<>{field('tools','Herramientas','Herramientas que llevás habitualmente.')}{field('transport','Transporte','Vehículo, capacidad para trasladar materiales.')}{field('materials','Materiales/repuestos','Qué comprás, transportás o debe aportar el cliente.')}{field('quoteMode','Forma de cotización','Por hora, por tarea o visita, según corresponda.')}{field('workLimits','Límites de trabajo','Tareas que no realizás; trabajos regulados deben derivarse.')}{field('certifications','Habilitaciones/certificaciones','Sólo las aplicables a tareas que realmente las requieran.')}</>}
  <h3>Referencias laborales <small>(hasta 2)</small></h3>
  {[0,1].map(i=>{const r=refs[i]||blankRef();return <div key={i} className="provider-profile-fields"><label>Nombre<Input value={r.nombre} onChange={e=>setRef(i,'nombre',e.target.value)}/></label><label>Relación<Input value={r.relacion} onChange={e=>setRef(i,'relacion',e.target.value)} placeholder="Cliente / empleador"/></label><label>Teléfono / WhatsApp<Input value={r.contacto} onChange={e=>setRef(i,'contacto',e.target.value)}/></label><label><input type="checkbox" checked={r.autorizado_contacto} onChange={e=>setRef(i,'autorizado_contacto',e.target.checked)}/> Autorizo a UGO a contactar esta referencia</label></div>})}
  {message&&<p role="status">{message}</p>}<Button type="button" variant="primary" disabled={busy} onClick={()=>void save()}>{busy?'Guardando…':'Guardar configuración del piloto'}</Button>
 </div>
}
