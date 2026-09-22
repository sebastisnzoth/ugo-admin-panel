import React,{useState}from'react'
import{ProviderPayoutPanel}from'../ProviderPayoutPanel'
import{useProviderData,money}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{Button,Card,SectionHeader,StatusPill,Textarea}from'../../shared/ui'
import{createProviderDebtPix,reportProviderDebtPaid,type ProviderPixDebtPayment}from'../../features/provider/services/providerEarningsService'

export function ProviderEarnings(){
 const d=useProviderData(),flow=useProviderFlow()
 const[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[pix,setPix]=useState<ProviderPixDebtPayment|null>(null)
 const pendingDebts=d.debts.filter(x=>x.ambiente==='real'&&!['pagado','anulado'].includes(x.estado)&&Number(x.saldo_pendiente||0)>0)
 const actionableDebt=pendingDebts.find(x=>x.estado!=='informado')||null
 async function reportPaid(id:string){
  const ref=window.prompt('Ingresá la referencia del pago realizado a UGO. La deuda seguirá pendiente hasta que UGO la concilie.','')
  if(ref===null)return
  if(ref.trim().length<4){setMessage('Ingresá una referencia válida.');return}
  setBusy(id);setMessage('')
  try{await reportProviderDebtPaid(id,ref)}catch(error){setBusy('');setMessage(error instanceof Error?error.message:'No se pudo informar el pago.');return}
  setBusy('')
  setMessage('Pago informado. UGO lo revisará y marcará la comisión como saldada.')
  if(pix?.deudaId===id)setPix(null)
  await d.reload()
 }
 async function startPix(debt:typeof pendingDebts[number]){
  setBusy(`pix:${debt.id}`);setMessage('')
  try{
   setPix(await createProviderDebtPix(d.accessToken,debt))
  }catch(error){setMessage(error instanceof Error?error.message:'No se pudo generar el pago a UGO.')}
  finally{setBusy('')}
 }
 async function copyPix(){
  if(!pix?.pixCopiaCola)return
  try{await navigator.clipboard.writeText(pix.pixCopiaCola);setMessage('Pix copiado. Pagalo desde tu banco y después informá la referencia a UGO.')}
  catch{window.prompt('Copiá este Pix para pagar a UGO:',pix.pixCopiaCola)}
 }
 return <section className="provider-screen provider-earnings-complete" aria-labelledby="provider-earnings-title">
  <Button variant="ghost" className="provider-back" onClick={flow.actions.openProfile}>← Perfil</Button>
  <SectionHeader eyebrow="TU DINERO" title="Ganancias" description="Separá lo que UGO custodia de lo que cobraste en efectivo y de la comisión que todavía debés a UGO." actions={<Button variant="ghost" onClick={flow.actions.openHistory}>Trabajos</Button>}/>
  <div className="provider-balance-grid">
   <article><small>SALDO UGO</small><strong>{money(d.released)}</strong><span>Pagos digitales liberados y disponibles para retiro</span></article>
   <article><small>EN PROCESO</small><strong>{money(d.retained)}</strong><span>Pago electrónico protegido hasta cerrar el trabajo</span></article>
   <article><small>COBRADO EN EFECTIVO</small><strong>{money(d.cashReceived)}</strong><span>Dinero que recibiste directamente del cliente</span></article>
   <article className={d.ugoDebt>0?'provider-debt-card':''}><small>DEBÉS A UGO</small><strong>{money(d.ugoDebt)}</strong><span>{d.debtBlocked?`Límite alcanzado: ${d.pendingDebtCount} servicios pendientes`:'Comisiones pendientes por cobros en efectivo'}</span>{d.ugoDebt>0&&<Button variant="primary" className="provider-primary provider-wide" disabled={!actionableDebt||busy.startsWith('pix:')} onClick={()=>actionableDebt&&void startPix(actionableDebt)}>{actionableDebt?'PAGAR UGO':'PAGO INFORMADO · EN REVISIÓN'}</Button>}</article>
  </div>

  {d.debtBlocked&&<Card className="provider-debt-lock" role="alert"><StatusPill tone="danger">Nuevos pedidos pausados</StatusPill><strong>Para recibir nuevos pedidos, primero pagá a UGO.</strong><span>Tenés {d.pendingDebtCount} servicios con comisión pendiente. Al llegar a 3, UGO te deja Offline y bloquea nuevas aceptaciones hasta que al menos una comisión quede conciliada.</span></Card>}

  {pix&&<Card className="provider-card provider-debt-payment" aria-label="Pago Pix a UGO"><div><span className="provider-kicker">PAGAR UGO · PIX</span><h2>Servicio #{pix.servicio} · {money(pix.monto,pix.moneda)}</h2><p>Copiá el Pix, pagalo desde tu banco y después informá la referencia. Generar el Pix no marca la deuda como pagada.</p></div><Textarea readOnly value={pix.pixCopiaCola} aria-label="Código Pix copia y pega"/><div className="provider-debt-payment-actions"><Button variant="primary" className="provider-primary" onClick={()=>void copyPix()}>COPIAR PIX</Button><Button variant="secondary" className="provider-secondary" onClick={()=>setPix(null)}>Cerrar</Button></div><small>Chave UGO: {pix.pixChave} · TXID {pix.txid}</small></Card>}

  {pendingDebts.length>0&&<Card className="provider-card" aria-label="Comisiones UGO pendientes">
   <div className="provider-section-head"><div><span className="provider-kicker">EFECTIVO · COMISIÓN UGO</span><h2 style={{margin:'4px 0'}}>Comisiones pendientes</h2><p>Cuando cobrás en efectivo, el cliente te entrega el total. La comisión de UGO queda registrada como deuda separada.</p></div></div>
   <div style={{display:'grid',gap:8}}>{pendingDebts.map(debt=><article key={debt.id} style={{border:'1px solid #dfe5e8',borderRadius:14,padding:12,display:'grid',gap:7}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'start'}}><div><small>Servicio #{debt.servicio?.numero||String(debt.servicio_id).slice(0,8)}</small><strong style={{display:'block',marginTop:3}}>Cobraste {money(debt.monto_servicio,debt.moneda)}</strong></div><strong style={{fontSize:18}}>{money(debt.saldo_pendiente,debt.moneda)}</strong></div>
    <div style={{fontSize:12,color:'#667085'}}>Comisión UGO · {debt.estado==='informado'?'pago informado, pendiente de conciliación':'pendiente de pago'}</div>
    {debt.referencia_pago&&<small>Referencia informada: {debt.referencia_pago}</small>}
    {debt.estado!=='informado'&&<><Button variant="primary" className="provider-primary provider-wide" disabled={busy===`pix:${debt.id}`} onClick={()=>void startPix(debt)}>{busy===`pix:${debt.id}`?'Generando Pix…':'PAGAR UGO · PIX'}</Button><Button variant="secondary" className="provider-secondary provider-wide" disabled={busy===debt.id} onClick={()=>void reportPaid(debt.id)}>{busy===debt.id?'Informando…':'YA PAGUÉ · INFORMAR REFERENCIA'}</Button></>}
   </article>)}</div>
  </Card>}

  {message&&<div className="provider-simple-status" role="status"><span>{message}</span></div>}
  <article className="provider-withdraw-guide"><span>1</span><div><strong>Saldo UGO</strong><p>Sólo los pagos digitales liberados entran en el saldo retirable.</p></div><span>2</span><div><strong>Efectivo</strong><p>Lo cobrás directamente del cliente; no vuelve a sumarse al saldo UGO.</p></div><span>3</span><div><strong>Comisión</strong><p>UGO registra lo que debés por cada cobro en efectivo hasta que quede conciliado.</p></div></article>
  <ProviderPayoutPanel accessToken={d.accessToken}/>
  <Button variant="secondary" className="provider-secondary provider-wide" onClick={flow.actions.openHistory}>Ver trabajos realizados</Button>
 </section>
}
