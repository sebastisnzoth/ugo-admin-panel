import React,{useCallback,useEffect,useState}from'react'
import type{Service}from'./shared'
import{supabase}from'../lib/supabase'

type Props={service:Service;accessToken?:string}
type PixState={estado?:string;pix_copia_cola?:string|null;pix_qr_code?:string|null;pix_expira_at?:string|null;mp_payment_id?:string|null;metodo?:string|null}

export function ClientPixPaymentPanel({service,accessToken}:Props){
 const[pix,setPix]=useState<PixState|null>(null)
 const[busy,setBusy]=useState(false)
 const[msg,setMsg]=useState('')
 const load=useCallback(async()=>{const{data}=await supabase.from('pagos').select('estado,metodo,pix_copia_cola,pix_qr_code,pix_expira_at,mp_payment_id').eq('servicio_id',service.id).order('created_at',{ascending:false}).limit(1).maybeSingle();setPix((data as PixState|null)||null)},[service.id])
 useEffect(()=>{load();const ch=supabase.channel(`client-pix-${service.id}`).on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`servicio_id=eq.${service.id}`},()=>load()).subscribe();return()=>{supabase.removeChannel(ch)}},[load,service.id])
 if(!['asignado','en_camino','en_progreso','esperando_aprobacion'].includes(service.estado))return null
 if(pix?.estado==='retenido'||pix?.estado==='liberado')return null
 async function createPix(){if(!accessToken)return setMsg('Sesión requerida.');setBusy(true);setMsg('');try{const r=await fetch('/api/pagos/crear',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({servicioId:service.id,metodo:'pix'})});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||'No se pudo generar Pix.');setPix({estado:body.estado||'pendiente',metodo:'pix',pix_copia_cola:body.pixCopiaCola,pix_qr_code:body.pixQrCode,pix_expira_at:body.pixExpiraAt,mp_payment_id:String(body.paymentId||'')});setMsg('Pix generado. El servicio se habilita cuando se confirme el pago.')}catch(e){setMsg(e instanceof Error?e.message:'No se pudo generar Pix.')}finally{setBusy(false)}}
 async function copy(){if(!pix?.pix_copia_cola)return;try{await navigator.clipboard.writeText(pix.pix_copia_cola);setMsg('Código Pix copiado.')}catch{setMsg('Copiá manualmente el código Pix.')}}
 const qr=pix?.pix_qr_code?`data:image/png;base64,${pix.pix_qr_code}`:null
 return <div style={{position:'fixed',left:'50%',bottom:86,transform:'translateX(-50%)',zIndex:74,width:'min(360px,calc(100vw - 28px))',background:'#fff',borderRadius:22,padding:16,boxShadow:'0 16px 44px rgba(0,0,0,.2)'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div><small style={{fontWeight:800}}>PIX · BRASIL</small><div style={{fontWeight:900,fontSize:18}}>Pagar servicio #{service.numero}</div></div><span style={{fontSize:26}}>◆</span></div>
  {!pix?.pix_copia_cola&&<button type="button" onClick={createPix} disabled={busy} style={{width:'100%',marginTop:12,padding:'13px 16px',border:0,borderRadius:14,fontWeight:900,cursor:'pointer'}}>{busy?'Generando Pix…':'Pagar con Pix'}</button>}
  {pix?.pix_copia_cola&&<div style={{marginTop:12,textAlign:'center'}}>{qr&&<img src={qr} alt="QR Code Pix" style={{width:190,height:190,objectFit:'contain',borderRadius:12}}/>}<textarea readOnly value={pix.pix_copia_cola} style={{width:'100%',minHeight:72,marginTop:10,borderRadius:10,padding:10,fontSize:11}}/><button type="button" onClick={copy} style={{width:'100%',padding:'11px 14px',border:0,borderRadius:12,fontWeight:900}}>Copiar código Pix</button>{pix.pix_expira_at&&<small style={{display:'block',marginTop:8}}>Expira {new Date(pix.pix_expira_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small>}</div>}
  {msg&&<p style={{fontSize:12,margin:'10px 0 0'}}>{msg}</p>}
 </div>
}
