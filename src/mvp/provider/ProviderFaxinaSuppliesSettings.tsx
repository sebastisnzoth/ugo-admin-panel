import React,{useEffect,useState}from'react'
import{useLocale}from'../../i18n/locale'
import{getRoleSupabase}from'../../lib/roleSupabase'

/** Optional, provider-set BRL supplies fee. It never alters the GPS or the base service tariff. */
export function ProviderFaxinaSuppliesSettings(){
 const{t}=useLocale()
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
  if(suppliesEnabled&&(!Number.isFinite(amount)||amount<=0||amount>1000)){setMessage(t('faxina.providerFaxinaSuppliesSettings.1'));return}
  setSaving(true);setMessage('')
  try{
   const sb=getRoleSupabase('provider'),{data:{user},error:authError}=await sb.auth.getUser()
   if(authError)throw authError
   if(!user)throw new Error('Sesión de proveedor requerida.')
   const{data,error}=await sb.from('perfiles_proveedor').update({faxina_productos_lleva:suppliesEnabled,faxina_productos_valor:suppliesEnabled?Math.round(amount*100)/100:0}).eq('usuario_id',user.id).select('faxina_productos_valor').single()
   if(error)throw error
   setFee(String(data.faxina_productos_valor))
   setMessage(t('faxina.providerFaxinaSuppliesSettings.2'))
  }catch(error){setMessage(error instanceof Error?error.message:'No se pudo guardar el valor.')}
  finally{setSaving(false)}
 }
 return <section className="provider-card" style={{marginTop:16,padding:16,border:'1px solid #cfe3d8',borderRadius:16}} aria-label="Faxina · produtos">
  <strong style={{display:'block',marginBottom:12}}>{t('faxina.providerFaxinaSuppliesSettings.3')}</strong>
  {loading?<p>{t('faxina.providerFaxinaSuppliesSettings.4')}</p>:<>
   <label style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,lineHeight:1.4}}><input type="checkbox" checked={suppliesEnabled} disabled={saving} onChange={event=>{setSuppliesEnabled(event.target.checked);setMessage('')}} style={{width:20,height:20}}/><span>{t('faxina.providerFaxinaSuppliesSettings.5')}</span></label>
   {suppliesEnabled&&<label style={{display:'block',fontWeight:700}}>{t('faxina.providerFaxinaSuppliesSettings.6')}<input type="number" min="0.01" max="1000" step="0.01" inputMode="decimal" value={fee} disabled={saving} onChange={event=>{setFee(event.target.value);setMessage('')}} style={{display:'block',boxSizing:'border-box',width:'100%',minHeight:46,marginTop:7,padding:10,border:'1px solid #bcd1c6',borderRadius:10,fontSize:16}}/></label>}
   <p style={{fontSize:13,color:'#5a695f'}}>{t('faxina.providerFaxinaSuppliesSettings.7')}</p>
   <button type="button" onClick={()=>void save()} disabled={saving} style={{minHeight:44,padding:'10px 18px',borderRadius:10,border:0,color:'#fff',background:'#087b63',fontWeight:750}}>{saving?(t('faxina.providerFaxinaSuppliesSettings.9')):(t('faxina.providerFaxinaSuppliesSettings.8'))}</button>
  </>}
  {message&&<p role="status" style={{fontSize:13,marginTop:10}}>{message}</p>}
 </section>
}
