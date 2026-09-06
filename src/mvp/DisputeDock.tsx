import React,{useState}from'react'
import type{UgoRole}from'../lib/roleSupabase'
import{useParticipantDispute}from'../hooks/useDisputes'
import'./dispute-dock.css'

const label=(s:string)=>s==='abierta'?'Abierta':s==='en_revision'?'En revisión':s==='resuelta_cliente'?'Resuelta a favor del cliente':s==='resuelta_proveedor'?'Resuelta a favor del proveedor':s==='cerrada'?'Cerrada':s

export function DisputeDock({role}:{role:UgoRole}){
 const{service,dispute,messages,loading,error,open,reply}=useParticipantDispute(role)
 const[visible,setVisible]=useState(false),[text,setText]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState<string|null>(null)
 if(!service&&!dispute)return null
 const unresolved=Boolean(dispute&&['abierta','en_revision'].includes(dispute.estado))
 const submit=async()=>{if(text.trim().length<8)return setNotice('Contá un poco más qué pasó.');setBusy(true);setNotice(null);try{if(dispute)await reply(text.trim());else await open(text.trim());setText('');setNotice(dispute?'Respuesta enviada al caso.':'Disputa abierta. UGO detuvo el flujo normal del servicio para revisión.')}catch(e){setNotice(e instanceof Error?e.message:'No se pudo registrar la disputa.')}finally{setBusy(false)}}
 return <>
  <button className={`ugo-dispute-launch ${unresolved?'open-case':''}`} onClick={()=>setVisible(true)}>{unresolved?'⚖ Caso abierto':'⚖ Ayuda / disputa'}</button>
  {visible&&<div className="ugo-dispute-backdrop" onClick={()=>setVisible(false)}><section className="ugo-dispute-sheet" onClick={e=>e.stopPropagation()}><header><div><small>UGO · PROTECCIÓN DEL SERVICIO</small><h3>{dispute?`Disputa #${dispute.numero||String(dispute.id).slice(0,8)}`:`Servicio #${service?.numero}`}</h3></div><button onClick={()=>setVisible(false)}>×</button></header>
   {loading&&<p>Cargando caso…</p>}{error&&<div className="ugo-dispute-note error">{error}</div>}
   {dispute?<><div className={`ugo-dispute-status ${dispute.estado}`}><b>{label(dispute.estado)}</b><span>{dispute.motivo}</span></div>{dispute.resolucion&&<div className="ugo-dispute-resolution"><small>RESOLUCIÓN UGO</small><strong>{label(dispute.estado)}</strong><p>{dispute.resolucion}</p></div>}<div className="ugo-dispute-thread">{messages.map(m=><article key={m.id} className={m.autor_rol}><small>{m.autor_rol==='admin'?'UGO Admin':m.autor_rol==='cliente'?'Cliente':'Proveedor'} · {new Date(m.created_at).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small><p>{m.mensaje}</p></article>)}</div>{unresolved&&<><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Agregá información para que UGO pueda revisar el caso…"/><button className="primary" onClick={submit} disabled={busy}>{busy?'Enviando…':'Enviar al caso'}</button></>}</>:<><div className="ugo-dispute-note"><b>¿Hay un problema con este servicio?</b><span>Podés abrir una disputa cuando necesitás que UGO revise el trabajo, el cumplimiento o el pago. La otra parte y el Admin verán el caso.</span></div><textarea value={text} onChange={e=>setText(e.target.value)} placeholder={role==='client'?'Explicá qué pasó con el proveedor o el trabajo…':'Explicá qué pasó con el cliente o el servicio…'}/><button className="danger" onClick={submit} disabled={busy}>{busy?'Abriendo…':'Abrir disputa'}</button></>}
   {notice&&<div className="ugo-dispute-note info">{notice}</div>}<footer>Las fotos de evidencia del servicio quedan disponibles para revisión administrativa. La resolución del caso no implica por sí sola un reembolso externo de Mercado Pago.</footer>
  </section></div>}
 </>
}
