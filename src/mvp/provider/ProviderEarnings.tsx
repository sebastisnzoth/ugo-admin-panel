import React,{useMemo,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{ProviderPayoutPanel}from'../ProviderPayoutPanel'
import{useProviderData,money}from'./providerData'
import{useProviderFlow}from'./providerFlow'

export function ProviderEarnings(){
 const d=useProviderData(),flow=useProviderFlow(),supabase=useMemo(()=>getRoleSupabase('provider'),[])
 const[busy,setBusy]=useState(''),[message,setMessage]=useState('')
 const pendingDebts=d.debts.filter(x=>x.ambiente==='real'&&!['pagado','anulado'].includes(x.estado))
 async function reportPaid(id:string){
  const ref=window.prompt('Ingresá la referencia del pago realizado a UGO. La deuda seguirá pendiente hasta que UGO la concilie.','')
  if(ref===null)return
  if(ref.trim().length<4){setMessage('Ingresá una referencia válida.');return}
  setBusy(id);setMessage('')
  const{error}=await(supabase as any).rpc('informar_pago_deuda_ugo',{p_deuda_id:id,p_referencia:ref.trim()})
  setBusy('')
  if(error){setMessage(error.message||'No se pudo informar el pago.');return}
  setMessage('Pago informado. UGO lo revisará y marcará la comisión como saldada.')
  await d.reload()
 }
 return <section className="provider-screen provider-earnings-complete" aria-labelledby="provider-earnings-title">
  <button type="button" className="provider-back" onClick={flow.actions.openProfile}>← Perfil</button>
  <header className="provider-section-head"><div><span className="provider-kicker">TU DINERO</span><h1 id="provider-earnings-title">Ganancias</h1><p>Separá lo que UGO custodia de lo que cobraste en efectivo y de la comisión que todavía debés a UGO.</p></div><button className="provider-link" type="button" onClick={flow.actions.openHistory}>Trabajos</button></header>
  <div className="provider-balance-grid">
   <article><small>SALDO UGO</small><strong>{money(d.released)}</strong><span>Pagos digitales liberados y disponibles para retiro</span></article>
   <article><small>EN PROCESO</small><strong>{money(d.retained)}</strong><span>Pago electrónico protegido hasta cerrar el trabajo</span></article>
   <article><small>COBRADO EN EFECTIVO</small><strong>{money(d.cashReceived)}</strong><span>Dinero que recibiste directamente del cliente</span></article>
   <article className={d.ugoDebt>0?'provider-debt-card':''}><small>DEBÉS A UGO</small><strong>{money(d.ugoDebt)}</strong><span>Comisiones pendientes por cobros en efectivo</span></article>
  </div>

  {pendingDebts.length>0&&<section className="provider-card" aria-label="Comisiones UGO pendientes">
   <div className="provider-section-head"><div><span className="provider-kicker">EFECTIVO · COMISIÓN UGO</span><h2 style={{margin:'4px 0'}}>Comisiones pendientes</h2><p>Cuando cobrás en efectivo, el cliente te entrega el total. La comisión de UGO queda registrada como deuda separada.</p></div></div>
   <div style={{display:'grid',gap:8}}>{pendingDebts.map(debt=><article key={debt.id} style={{border:'1px solid #dfe5e8',borderRadius:14,padding:12,display:'grid',gap:7}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'start'}}><div><small>Servicio #{debt.servicio?.numero||String(debt.servicio_id).slice(0,8)}</small><strong style={{display:'block',marginTop:3}}>Cobraste {money(debt.monto_servicio,debt.moneda)}</strong></div><strong style={{fontSize:18}}>{money(debt.saldo_pendiente,debt.moneda)}</strong></div>
    <div style={{fontSize:12,color:'#667085'}}>Comisión UGO · {debt.estado==='informado'?'pago informado, pendiente de conciliación':'pendiente de pago'}</div>
    {debt.referencia_pago&&<small>Referencia informada: {debt.referencia_pago}</small>}
    {debt.estado!=='informado'&&<button type="button" className="provider-secondary provider-wide" disabled={busy===debt.id} onClick={()=>void reportPaid(debt.id)}>{busy===debt.id?'Informando…':'YA PAGUÉ A UGO · INFORMAR REFERENCIA'}</button>}
   </article>)}</div>
  </section>}

  {message&&<div className="provider-simple-status" role="status"><span>{message}</span></div>}
  <article className="provider-withdraw-guide"><span>1</span><div><strong>Saldo UGO</strong><p>Sólo los pagos digitales liberados entran en el saldo retirable.</p></div><span>2</span><div><strong>Efectivo</strong><p>Lo cobrás directamente del cliente; no vuelve a sumarse al saldo UGO.</p></div><span>3</span><div><strong>Comisión</strong><p>UGO registra lo que debés por cada cobro en efectivo hasta que quede conciliado.</p></div></article>
  <ProviderPayoutPanel accessToken={d.accessToken}/>
  <button className="provider-secondary provider-wide" type="button" onClick={flow.actions.openHistory}>Ver trabajos realizados</button>
 </section>
}
