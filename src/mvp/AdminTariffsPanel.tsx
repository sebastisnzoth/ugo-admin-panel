import{useLocale}from'../i18n/locale'
import React,{useMemo,useState}from'react'
import{useCategorias,useTarifas}from'../hooks/useAdminData'
import{useDialog}from'./dialogs'
import'./admin-tariffs.css'

type Draft={id?:string;categoriaId:string;zona:string;base:string;hora:string;min:string;max:string}

const emptyDraft=(categoriaId=''):Draft=>({categoriaId,zona:'General',base:'',hora:'',min:'',max:''})
const money=(v:any)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`

export function AdminTariffsPanel(){
 const{t}=useLocale();
 const{tarifas,loading,error,upsert,setActiva,refetch}=useTarifas()
 const{categorias}=useCategorias()
 const activeCategories=useMemo(()=>categorias.filter((c:any)=>c.activa),[categorias])
 const[draft,setDraft]=useState<Draft>(()=>emptyDraft()),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const{confirm,node:dialog}=useDialog()
 const editing=Boolean(draft.id)

 const startCreate=()=>{setDraft(emptyDraft(activeCategories[0]?.id||''));setMessage('')}
 const startEdit=(t:any)=>{setDraft({id:t.id,categoriaId:t.categoria_id,zona:t.zona||'General',base:String(t.precio_base??''),hora:String(t.precio_hora??''),min:String(t.precio_min??''),max:t.precio_max==null?'':String(t.precio_max)});setMessage('')}
 const save=async()=>{
  const categoriaId=draft.categoriaId,zona=draft.zona.trim()||'General',base=Number(draft.base||0),hora=Number(draft.hora||0),min=Number(draft.min||0),max=draft.max===''?null:Number(draft.max)
  if(!categoriaId){setMessage('Elegí una categoría.');return}
  if(Math.max(base,hora,min)<=0){setMessage('Definí al menos un importe positivo.');return}
  if([base,hora,min,max??0].some(v=>!Number.isFinite(v)||v<0)){setMessage('Los importes deben ser números válidos mayores o iguales a cero.');return}
  if(max!=null&&max>0&&min>0&&max<min){setMessage('El máximo no puede ser menor que el mínimo.');return}
  setBusy(true);setMessage('')
  try{
   await upsert(categoriaId,zona,{base,hora,min,max})
   setMessage(editing?'Tarifa actualizada y auditada.':'Tarifa creada y auditada.')
   setDraft(emptyDraft(categoriaId))
  }catch(e){setMessage(e instanceof Error?e.message:'No se pudo guardar la tarifa.')}finally{setBusy(false)}
 }
 const toggle=async(t:any)=>{
  const next=!t.activa
  if(!await confirm({title:next?'Activar tarifa':'Desactivar tarifa',message:`${next?'Activar':'Desactivar'} la tarifa de ${t.categorias?.nombre||'esta categoría'} para ${t.zona}?`,danger:!next}))return
  setBusy(true);setMessage('')
  try{await setActiva(t.id,next);setMessage(next?'Tarifa activada.':'Tarifa desactivada.')}catch(e){setMessage(e instanceof Error?e.message:'No se pudo actualizar la tarifa.')}finally{setBusy(false)}
 }

 return <section className="ugo-tariffs">
  <header className="ugo-tariffs-head"><div><small>{t('screen.admin_tariffs.1')}</small><h3>{t('screen.admin_tariffs.2')}</h3><p>Definí la referencia que UGO puede usar al cotizar un pedido. “General” funciona como respaldo cuando no hay una zona específica.</p></div><div><button type="button" onClick={startCreate}>{t('screen.admin_tariffs.3')}</button><button type="button" onClick={()=>void refetch()} disabled={loading}>{t('screen.admin_tariffs.4')}</button></div></header>

  <div className="ugo-tariff-editor">
   <div className="ugo-tariff-editor-title"><div><small>{editing?'EDITANDO TARIFA':'NUEVA TARIFA'}</small><strong>{editing?'Actualizá los valores':'Configurá una categoría y zona'}</strong></div>{editing&&<button type="button" onClick={startCreate}>{t('screen.admin_tariffs.5')}</button>}</div>
   <div className="ugo-tariff-fields">
    <label>{t('screen.admin_tariffs.6')}<select value={draft.categoriaId} onChange={e=>setDraft(v=>({...v,categoriaId:e.target.value}))}><option value="">{t('screen.admin_tariffs.7')}</option>{activeCategories.map((c:any)=><option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}</select></label>
    <label>{t('screen.admin_tariffs.8')}<input value={draft.zona} onChange={e=>setDraft(v=>({...v,zona:e.target.value}))} placeholder="General o Canasvieiras"/></label>
    <label>{t('screen.admin_tariffs.9')}<input inputMode="decimal" value={draft.base} onChange={e=>setDraft(v=>({...v,base:e.target.value}))} placeholder="0,00"/></label>
    <label>{t('screen.admin_tariffs.10')}<input inputMode="decimal" value={draft.hora} onChange={e=>setDraft(v=>({...v,hora:e.target.value}))} placeholder="0,00"/></label>
    <label>{t('screen.admin_tariffs.11')}<input inputMode="decimal" value={draft.min} onChange={e=>setDraft(v=>({...v,min:e.target.value}))} placeholder="0,00"/></label>
    <label>{t('screen.admin_tariffs.12')}<input inputMode="decimal" value={draft.max} onChange={e=>setDraft(v=>({...v,max:e.target.value}))} placeholder="opcional"/></label>
   </div>
   <div className="ugo-tariff-editor-actions"><span>{t('screen.admin_tariffs.13')}</span><button type="button" className="primary" onClick={()=>void save()} disabled={busy}>{busy?'Guardando…':editing?'Guardar cambios':'Crear tarifa'}</button></div>
  </div>

  {message&&<div className="ugo-tariff-message" role="status">{message}</div>}
  {error&&<div className="ugo-tariff-error" role="alert"><strong>{t('screen.admin_tariffs.14')}</strong><span>{error}</span><button type="button" onClick={()=>void refetch()}>{t('screen.admin_tariffs.15')}</button></div>}

  {loading&&!tarifas.length?<div className="ugo-tariff-empty">{t('screen.admin_tariffs.16')}</div>:tarifas.length?<div className="ugo-tariff-table-wrap"><table><thead><tr><th>{t('screen.admin_tariffs.6')}</th><th>{t('screen.admin_tariffs.8')}</th><th>{t('screen.admin_tariffs.17')}</th><th>{t('screen.admin_tariffs.18')}</th><th>{t('screen.admin_tariffs.19')}</th><th>{t('screen.admin_tariffs.20')}</th><th>{t('screen.admin_tariffs.21')}</th><th>{t('screen.admin_tariffs.22')}</th></tr></thead><tbody>{tarifas.map((t:any)=><tr key={t.id} className={t.activa?'':'disabled'}><td><strong>{t.categorias?.emoji} {t.categorias?.nombre||'Categoría'}</strong></td><td>{t.zona||'General'}</td><td>{money(t.precio_base)}</td><td>{money(t.precio_hora)}</td><td>{money(t.precio_min)}</td><td>{t.precio_max==null?'—':money(t.precio_max)}</td><td><span className={t.activa?'active':'inactive'}>{t.activa?'Activa':'Desactivada'}</span></td><td><div className="ugo-tariff-row-actions"><button type="button" onClick={()=>startEdit(t)}>{t('screen.admin_tariffs.23')}</button><button type="button" onClick={()=>void toggle(t)} disabled={busy}>{t.activa?'Desactivar':'Activar'}</button></div></td></tr>)}</tbody></table></div>:<div className="ugo-tariff-empty"><strong>{t('screen.admin_tariffs.24')}</strong><span>{t('screen.admin_tariffs.25')}</span><button type="button" onClick={startCreate}>{t('screen.admin_tariffs.26')}</button></div>}
 {dialog}
 </section>
}
export default AdminTariffsPanel
