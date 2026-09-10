import React,{useCallback,useEffect,useState}from'react'
import type{Service}from'./shared'
import{supabase}from'../lib/supabase'

type Props={service:Service;accessToken?:string}
type PixState={estado?:string;pix_copia_cola?:string|null;pix_qr_code?:string|null;pix_expira_at?:string|null;mp_payment_id?:string|null;metodo?:string|null;pix_informado_at?:string|null;pix_e2e_id?:string|null;pix_txid?:string|null}

export function ClientPixPaymentPanel({service,accessToken}:Props){
 const[pix,setPix]=useState<PixState|null>(null)
 const[demoAllowed,setDemoAllowed]=useState(false)
 const[busy,setBusy]=useState(false)
 const[msg,setMsg]=useState('')
 const load=useCallback(async()=>{const{data}=await supabase.from('pagos').select('estado,metodo,pix_copia_cola,pix_qr_code,pix_expira_at,mp_payment_id,pix_informado_at,pix_e2e_id,pix_txid').eq('servicio_id',service.id).limit(1).maybeSingle();setPix((data as PixState|null)||null)},[service.id])
 useEffect(()=>{load();supabase.auth.getUser().then(({data})=>setDemoAllowed(Boolean(data.user?.email&&/@ugo\.test$/i.test(data.user.email))));const ch=supabase.channel(`client-pix-${service.id}`).on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`servicio_id=eq.${service.id}`},()=>load()).subscribe();return()=>{supabase.removeChannel(ch)}},[load,service.id])
 if(!['asignado','en_camino','llegado','en_progreso','esperando_aprobacion'].includes(service.estado))return null
 if(pix?.estado==='retenido'||pix?.estado==='liberado')return null

 async function createPix(){if(!accessToken)return setMsg('Sesión requerida.');setBusy(true);setMsg('');try{const r=await fetch('/api/pagos/crear',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({servicioId:service.id,metodo:'pix'})});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||'No se pudo generar Pix.');if(body.alreadyPaid){await load();return}setPix({estado:body.estado||'pendiente',metodo:'pix',pix_copia_cola:body.pixCopiaCola,pix_qr_code:body.pixQrCode||null,pix_expira_at:body.pixExpiraAt||null,mp_payment_id:body.paymentId?String(body.paymentId):null,pix_informado_at:body.informadoAt||null,pix_txid:body.pixTxid||null});setMsg('Pix generado. El servicio se habilita cuando se confirme el pago.')}catch(e){setMsg(e instanceof Error?e.message:'No se pudo generar Pix.')}finally{setBusy(false)}}
 async function simulatePix(){setBusy(true);setMsg('');try{const{error}=await(supabase as any).rpc('crear_pix_demo',{p_servicio_id:service.id});if(error)throw error;setMsg('Pago demo aprobado. No se movió dinero real.');await load()}catch(e){setMsg(e instanceof Error?e.message:'No se pudo simular el pago.')}finally{setBusy(false)}}
 async function copy(){if(!pix?.pix_copia_cola)return;try{await navigator.clipboard.writeText(pix.pix_copia_cola);setMsg('Código Pix copiado.')}catch{setMsg('Copiá manualmente el código Pix.')}}
 const qr=pix?.pix_qr_code?`data:image/png;base64,${pix.pix_qr_code}`:null
 return <div style={{position:'fixed',left:'50%',bottom:92,transform:'translateX(-50%)',zIndex:74,width:'min(360px,calc(100vw - 28px))',background:'#fff',borderRadius:24,padding:18,boxShadow:'0 18px 50px rgba(0,0,0,.18)',border:'1px solid rgba(0,0,0,.05)'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14}}><div><small style={{fontWeight:800,color:'#667085',letterSpacing:'.04em'}}>PAGO SEGURO</small><div style={{fontWeight:900,fontSize:20,color:'#101828',marginTop:3}}>Pagar servicio #{service.numero}</div><p style={{fontSize:13,lineHeight:1.4,color:'#667085',margin:'6px 0 0'}}>Pagá con Pix para confirmar el servicio.</p></div><span style={{width:38,height:38,borderRadius:999,display:'grid',placeItems:'center',background:'#ecfdf3',color:'#067647',fontWeight:900}}>✓</span></div>
  {!pix?.pix_copia_cola&&<><button type="button" onClick={createPix} disabled={busy} style={{width:'100%',marginTop:16,padding:'14px 16px',border:0,borderRadius:16,fontWeight:900,cursor:'pointer',background:'#079455',color:'#fff',fontSize:15}}>{busy?'Generando Pix…':'Pagar con Pix'}</button>{demoAllowed&&<button type="button" onClick={simulatePix} disabled={busy} style={{width:'100%',marginTop:9,padding:'11px 14px',border:'1px solid #e4e7ec',borderRadius:14,fontWeight:800,background:'#fff',cursor:'pointer',color:'#475467'}}>Simular pago demo</button>}</>}
  {pix?.pix_copia_cola&&<div style={{marginTop:16,textAlign:'center'}}>{qr&&<img src={qr} alt="QR Code Pix" style={{width:184,height:184,objectFit:'contain',borderRadius:16,border:'1px solid #eaecf0'}}/>}<div style={{fontSize:13,fontWeight:800,color:'#344054',marginTop:10}}>Escaneá el QR o copiá el código</div><textarea readOnly value={pix.pix_copia_cola} style={{width:'100%',minHeight:68,marginTop:10,border:'1px solid #e4e7ec',borderRadius:12,padding:10,fontSize:11,background:'#f9fafb',resize:'none'}}/><button type="button" onClick={copy} style={{width:'100%',padding:'12px 14px',border:0,borderRadius:14,fontWeight:900,background:'#101828',color:'#fff'}}>Copiar código Pix</button>{pix.pix_expira_at&&<small style={{display:'block',marginTop:8,color:'#667085'}}>Válido hasta {new Date(pix.pix_expira_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small>}</div>}
  {msg&&<p style={{fontSize:12,lineHeight:1.4,color:'#475467',margin:'10px 0 0'}}>{msg}</p>}
 </div>
}
