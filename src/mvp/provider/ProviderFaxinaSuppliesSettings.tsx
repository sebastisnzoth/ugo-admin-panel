import React,{useEffect,useState}from'react'
import{useLocale}from'../../i18n/locale'
import{getRoleSupabase}from'../../lib/roleSupabase'

/** Optional, provider-set BRL supplies fee. It never alters the GPS or the base service tariff. */
export function ProviderFaxinaSuppliesSettings(){
 const{locale}=useLocale()
 const pt=locale.startsWith('pt'),es=locale.startsWith('es')
 const[suppliesEnabled,setSuppliesEnabled]=useState(false),[fee,setFee]=useState(''),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{let alive=true;void(async()=>{
  try{
   const sb=getRoleSupabase('provider'),{data:{user},error:authError}=await sb.auth.getUser()
   if(authError)throw authError
   if(!user)throw new Error('Iniciá sesión como proveedor.')
   const{data,error}=await sb.from('perfiles_proveedor').select('faxina_productos_lleva,faxina_productos_valor').eq('usuario_id',user.id).maybeSingle()
   if(error)throw error
   if(alive){setSuppliesEnabled(Boolean(data?.faxina_productos_lleva));setFee(data?.faxina_productos_valor!=null?String(data.faxina_productos_valor):'')}
  }catch(error){if(alive)setMessage(error instanceof Error?error.message:'No se pudo cargar el valor de productos.')}
  finally{if(alive)setLoading(false)}
 })();return()=>{alive=false}},[])
 const save=async()=>{
  const amount=Number(fee.replace(',','.'))
  if(suppliesEnabled&&(!Number.isFinite(amount)||amount<=0||amount>1000)){setMessage(pt?'Informe um valor entre R$ 0,01 e R$ 1.000.':es?'Ingresá un valor entre R$ 0,01 y R$ 1.000.':'Enter an amount between R$ 0.01 and R$ 1,000.');return}
  setSaving(true);setMessage('')
  try{
   const sb=getRoleSupabase('provider'),{data:{user},error:authError}=await sb.auth.getUser()
   if(authError)throw authError
   if(!user)throw new Error('Sesión de proveedor requerida.')
   const{data,error}=await sb.from('perfiles_proveedor').update({faxina_productos_lleva:suppliesEnabled,faxina_productos_valor:suppliesEnabled?Math.round(amount*100)/100:0}).eq('usuario_id',user.id).select('faxina_productos_valor').single()
   if(error)throw error
   setFee(String(data.faxina_productos_valor))
   setMessage(pt?'Valor de produtos salvo.':es?'Valor de productos guardado.':'Supplies price saved.')
  }catch(error){setMessage(error instanceof Error?error.message:'No se pudo guardar el valor.')}
  finally{setSaving(false)}
 }
 return <section className="provider-card" style={{marginTop:16,padding:16,border:'1px solid #cfe3d8',borderRadius:16}} aria-label="Faxina · produtos">
  <strong style={{display:'block',marginBottom:12}}>{pt?'Faxina · Produtos de limpeza':es?'Faxina · Productos de limpieza':'Cleaning · Supplies'}</strong>
  {loading?<p>{pt?'Carregando…':es?'Cargando…':'Loading…'}</p>:<>
   <label style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,lineHeight:1.4}}><input type="checkbox" checked={suppliesEnabled} disabled={saving} onChange={event=>{setSuppliesEnabled(event.target.checked);setMessage('')}} style={{width:20,height:20}}/><span>{pt?'Ofereço levar produtos de limpeza':es?'Ofrezco llevar productos de limpieza':'I offer to bring cleaning supplies'}</span></label>
   {suppliesEnabled&&<label style={{display:'block',fontWeight:700}}>{pt?'Valor adicional (R$)':es?'Valor adicional (R$)':'Additional fee (R$)'}<input type="number" min="0.01" max="1000" step="0.01" inputMode="decimal" value={fee} disabled={saving} onChange={event=>{setFee(event.target.value);setMessage('')}} style={{display:'block',boxSizing:'border-box',width:'100%',minHeight:46,marginTop:7,padding:10,border:'1px solid #bcd1c6',borderRadius:10,fontSize:16}}/></label>}
   <p style={{fontSize:13,color:'#5a695f'}}>{pt?'O cliente precisa aprovar o adicional antes da cobrança.':es?'El cliente debe aprobar el adicional antes del cobro.':'The client must approve this fee before any charge.'}</p>
   <button type="button" onClick={()=>void save()} disabled={saving} style={{minHeight:44,padding:'10px 18px',borderRadius:10,border:0,color:'#fff',background:'#087b63',fontWeight:750}}>{saving?(pt?'Salvando…':'Guardando…'):(pt?'Salvar valor':es?'Guardar valor':'Save price')}</button>
  </>}
  {message&&<p role="status" style={{fontSize:13,marginTop:10}}>{message}</p>}
 </section>
}
