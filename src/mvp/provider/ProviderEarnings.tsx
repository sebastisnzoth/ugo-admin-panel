import React,{useMemo,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{ProviderPayoutPanel}from'../ProviderPayoutPanel'
import{useProviderData,money}from'./providerData'
import{useProviderFlow}from'./providerFlow'

type PixDebtPayment={deudaId:string;servicio:string;monto:number;moneda:string;pixCopiaCola:string;pixChave:string;txid:string}

export function ProviderEarnings(){
 const d=useProviderData(),flow=useProviderFlow(),supabase=useMemo(()=>getRoleSupabase('provider'),[])
 const[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[pix,setPix]=useState<PixDebtPayment|null>(null)
 const pendingDebts=d.debts.filter(x=>x.ambiente==='real'&&!['pagado','anulado'].includes(x.estado)&&Number(x.saldo_pendiente||0)>0)
 const actionableDebt=pendingDebts.find(x=>x.estado!=='informado')||null
 async function reportPaid(id:string){
  const ref=window.prompt('Ingresá la referencia del pago realizado a UGO. La deuda seguirá pendiente hasta que UGO la concilie.','')
  if(ref===null)return
  if(ref.trim().length<4){setMessage('Ingresá una referencia válida.');return}
  setBusy(id);setMessage('')
  const{error}=await(supabase as any).rpc('informar_pago_deuda_ugo',{p_deuda_id:id,p_referencia:ref.trim()})
  setBusy('')
  if(error){setMessage(error.message||'No se pudo informar el pago.');return}
  setMessage('Pago informado. UGO lo revisará y marcará la comisión como saldada.')
  if(pix?.deudaId===id)setPix(null)
  await d.reload()
 }
 async function startPix(debt:typeof pendingDebts[number]){
  setBusy(`pix:${debt.id}`);setMessage('')
  try{
   const response=await fetch('/api/deudas/pagar',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${d.accessToken}`},body:JSON.stringify({deudaId:debt.id})})
   const payload=await response.json().catch(()=>({}))
   if(!response.ok)throw new Error(payload.error||'No se pudo generar el pago a UGO.')
   setPix({deudaId:debt.id,servicio:String(debt.servicio?.numero||String(debt.servicio_id).slice(0,8)),monto:Number(payload.monto||debt.saldo_pendiente||0),moneda:String(payload.moneda||debt.moneda||'BRL'),pixCopiaCola:String(payload.pixCopiaCola||''),pixChave:String(payload.pixChave||''),txid:String(payload.txid||'')})
  }catch(error){setMessage(error instanceof Error?error.message:'No se pudo generar el pago a UGO.')}
  finally{setBusy('')}
 }
 async function copyPix(){
  if(!pix?.pixCopiaCola)return
  try{await navigator.clipboard.writeText(pix.pixCopiaCola);setMessage('Pix copiado. Pagalo desde tu banco y después informá la referencia a UGO.')}
  catch{window.prompt('Copiá este Pix para pagar a UGO:',pix.pixCopiaCola)}
 }
 return <section className="provider-screen provider-earnings-complete" aria-labelledby="provider-earnings-title">
  <button type="button" className="provider-back" onClick={flow.actions.openProfile}>← Perfil</button>
  <header className="provider-section-head"><div><span className="provider-kicker">TU DINERO</span><h1 id="provider-earnings-title">Ganancias</h1><p>Separá lo que UGO custodia de lo que cobraste en efectivo y de la comisión que todavía debés a UGO.</p></div><button className="provider-link" type="button" onClick={flow.actions.openHistory}>Trabajos</button></header>
  <div className="provider-balance-grid">
   <article><small>SALDO UGO</small><strong>{money(d.released)}</strong><span>Pagos digitales liberados y disponibles para retiro</span></article>
   <article><small>EN PROCESO</small><strong>{money(d.retained)}</strong><span>Pago electrónico protegido hasta cerrar el trabajo</span></article>
   <article><small>COBRADO EN EFECTIVO</small><strong>{money(d.cashReceived)}</strong><span>Dinero que recibiste directamente del cliente</span></article>
   <article className={d.ugoDebt>0?'provider-debt-card':''}><small>DEBÉS A UGO</small><strong>{money(d.ugoDebt)}</strong><span>{d.debtBlocked?`Límite alcanzado: ${d.pendingDebtCount} servicios pendientes`:'Comisiones pendientes por cobros en efectivo'}</span>{d.ugoDebt>0&&<button type="button" className="provider-primary provider-wide" disabled={!actionableDebt||busy.startsWith('pix:')} onClick={()=>actionableDebt&&void startPix(actionableDebt)}>{actionableDebt?'PAGAR UGO':'PAGO INFORMADO · EN REVISIÓN'}</button>}</article>
  </div>

  {d.debtBlocked&&<div className="provider-debt-lock" role="alert"><strong>Para recibir nuevos pedidos, primero pagá a UGO.</strong><span>Tenés {d.pendingDebtCount} servicios con comisión pendiente. Al llegar a 3, UGO te deja Offline y bloquea nuevas aceptaciones hasta que al menos una comisión quede conciliada.</span></div>}

  {pix&&<section className="provider-card provider-debt-payment" aria-label="Pago Pix a UGO"><div><span className="provider-kicker">PAGAR UGO · PIX</span><h2>Servicio #{pix.servicio} · {money(pix.monto,pix.moneda)}</h2><p>Copiá el Pix, pagalo desde tu banco y después informá la referencia. Generar el Pix no marca la deuda como pagada.</p></div><textarea readOnly value={pix.pixCopiaCola} aria-label="Código Pix copia y pega"/><div className="provider-debt-payment-actions"><button type="button" className="provider-primary" onClick={()=>void copyPix()}>COPIAR PIX</button><button type="button" className="provider-secondary" onClick={()=>setPix(null)}>Cerrar</button></div><small>Chave UGO: {pix.pixChave} · TXID {pix.txid}</small></section>}

  {pendingDebts.length>0&&<section className="provider-card" aria-label="Comisiones UGO pendientes">
   <div className="provider-section-head"><div><span className="provider-kicker">EFECTIVO · COMISIÓN UGO</span><h2 style={{margin:'4px 0'}}>Comisiones pendientes</h2><p>Cuando cobrás en efectivo, el cliente te entrega el total. La comisión de UGO queda registrada como deuda separada.</p></div></div>
   <div style={{display:'grid',gap:8}}>{pendingDebts.map(debt=><article key={debt.id} style={{border:'1px solid #dfe5e8',borderRadius:14,padding:12,display:'grid',gap:7}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'start'}}><div><small>Servicio #{debt.servicio?.numero||String(debt.servicio_id).slice(0,8)}</small><strong style={{display:'block',marginTop:3}}>Cobraste {money(debt.monto_servicio,debt.moneda)}</strong></div><strong style={{fontSize:18}}>{money(debt.saldo_pendiente,debt.moneda)}</strong></div>
    <div style={{fontSize:12,color:'#667085'}}>Comisión UGO · {debt.estado==='informado'?'pago informado, pendiente de conciliación':'pendiente de pago'}</div>
    {debt.referencia_pago&&<small>Referencia informada: {debt.referencia_pago}</small>}
    {debt.estado!=='informado'&&<><button type="button" className="provider-primary provider-wide" disabled={busy===`pix:${debt.id}`} onClick={()=>void startPix(debt)}>{busy===`pix:${debt.id}`?'Generando Pix…':'PAGAR UGO · PIX'}</button><button type="button" className="provider-secondary provider-wide" disabled={busy===debt.id} onClick={()=>void reportPaid(debt.id)}>{busy===debt.id?'Informando…':'YA PAGUÉ · INFORMAR REFERENCIA'}</button></>}
   </article>)}</div>
  </section>}

  {message&&<div className="provider-simple-status" role="status"><span>{message}</span></div>}
  <article className="provider-withdraw-guide"><span>1</span><div><strong>Saldo UGO</strong><p>Sólo los pagos digitales liberados entran en el saldo retirable.</p></div><span>2</span><div><strong>Efectivo</strong><p>Lo cobrás directamente del cliente; no vuelve a sumarse al saldo UGO.</p></div><span>3</span><div><strong>Comisión</strong><p>UGO registra lo que debés por cada cobro en efectivo hasta que quede conciliado.</p></div></article>
  <ProviderPayoutPanel accessToken={d.accessToken}/>
  <button className="provider-secondary provider-wide" type="button" onClick={flow.actions.openHistory}>Ver trabajos realizados</button>
 </section>
}
