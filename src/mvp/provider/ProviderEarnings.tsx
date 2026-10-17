import{useLocale}from'../../i18n/locale'
import React,{useState}from'react'
import{ProviderPayoutPanel}from'../ProviderPayoutPanel'
import{useProviderData,money}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{Button,Card,SectionHeader,StatusPill,Textarea}from'../../shared/ui'
import{useDialog}from'../dialogs'
import{createProviderDebtPix,reportProviderDebtPaid,type ProviderPixDebtPayment}from'../../features/provider/services/providerEarningsService'

export function ProviderEarnings(){
 const{t}=useLocale()
 const d=useProviderData(),flow=useProviderFlow()
 const[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[pix,setPix]=useState<ProviderPixDebtPayment|null>(null)
const{prompt,node:dialog}=useDialog()
 const pendingDebts=d.debts.filter(x=>x.ambiente==='real'&&!['pagado','anulado'].includes(x.estado)&&Number(x.saldo_pendiente||0)>0)
 const actionableDebt=pendingDebts.find(x=>x.estado!=='informado')||null
 async function reportPaid(id:string){
  const ref=await prompt({title:'Informar pago a UGO',message:'Ingresá la referencia del pago realizado a UGO. La deuda seguirá pendiente hasta que UGO la concilie.',label:'Referencia del pago',required:true})
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
  catch{void prompt({title:'Pix para pagar a UGO',message:'Copiá este Pix para pagar a UGO desde tu banco y después informá la referencia.',label:'Código Pix copia y pega',defaultValue:pix.pixCopiaCola})}
 }
 return <section className="provider-screen provider-earnings-complete" aria-labelledby="provider-earnings-title">
  <Button variant="ghost" className="provider-back" onClick={flow.actions.openProfile}>{t('screen.earnings.1')}</Button>
  <SectionHeader eyebrow="TU DINERO" title="Ganancias" description="Separá lo que UGO custodia de lo que cobraste en efectivo y de la comisión que todavía debés a UGO." actions={<Button variant="ghost" onClick={flow.actions.openHistory}>{t('screen.earnings.2')}</Button>}/>
  <div className="provider-balance-grid">
   <article><small>{t('screen.earnings.3')}</small><strong>{money(d.released)}</strong><span>{t('screen.earnings.4')}</span></article>
   <article><small>{t('screen.earnings.5')}</small><strong>{money(d.retained)}</strong><span>{t('screen.earnings.6')}</span></article>
   <article><small>{t('screen.earnings.7')}</small><strong>{money(d.cashReceived)}</strong><span>{t('screen.earnings.8')}</span></article>
   <article className={d.ugoDebt>0?'provider-debt-card':''}><small>{t('screen.earnings.9')}</small><strong>{money(d.ugoDebt)}</strong><span>{d.debtBlocked?`Límite alcanzado: ${d.pendingDebtCount} servicios pendientes`:'Comisiones pendientes por cobros en efectivo'}</span>{d.ugoDebt>0&&<Button variant="primary" className="provider-primary provider-wide" disabled={!actionableDebt||busy.startsWith('pix:')} onClick={()=>actionableDebt&&void startPix(actionableDebt)}>{actionableDebt?'PAGAR UGO':'PAGO INFORMADO · EN REVISIÓN'}</Button>}</article>
  </div>

  {d.debtBlocked&&<Card className="provider-debt-lock" role="alert"><StatusPill tone="danger">{t('screen.earnings.10')}</StatusPill><strong>{t('screen.earnings.11')}</strong><span>Tenés {d.pendingDebtCount} servicios con comisión pendiente. Al llegar a 3, UGO te deja Offline y bloquea nuevas aceptaciones hasta que al menos una comisión quede conciliada.</span></Card>}

  {pix&&<Card className="provider-card provider-debt-payment" aria-label="Pago Pix a UGO"><div><span className="provider-kicker">{t('screen.earnings.12')}</span><h2>Servicio #{pix.servicio} · {money(pix.monto,pix.moneda)}</h2><p>{t('screen.earnings.13')}</p></div><Textarea readOnly value={pix.pixCopiaCola} aria-label="Código Pix copia y pega"/><div className="provider-debt-payment-actions"><Button variant="primary" className="provider-primary" onClick={()=>void copyPix()}>{t('screen.earnings.14')}</Button><Button variant="secondary" className="provider-secondary" onClick={()=>setPix(null)}>{t('screen.earnings.15')}</Button></div><small>Chave UGO: {pix.pixChave} · TXID {pix.txid}</small></Card>}

  {pendingDebts.length>0&&<Card className="provider-card" aria-label="Comisiones UGO pendientes">
   <div className="provider-section-head"><div><span className="provider-kicker">{t('screen.earnings.16')}</span><h2 style={{margin:'4px 0'}}>{t('screen.earnings.17')}</h2><p>{t('screen.earnings.18')}</p></div></div>
   <div style={{display:'grid',gap:8}}>{pendingDebts.map(debt=><article key={debt.id} style={{border:'1px solid #dfe5e8',borderRadius:14,padding:12,display:'grid',gap:7}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'start'}}><div><small>Servicio #{debt.servicio?.numero||String(debt.servicio_id).slice(0,8)}</small><strong style={{display:'block',marginTop:3}}>Cobraste {money(debt.monto_servicio,debt.moneda)}</strong></div><strong style={{fontSize:18}}>{money(debt.saldo_pendiente,debt.moneda)}</strong></div>
    <div style={{fontSize:12,color:'#647269'}}>Comisión UGO · {debt.estado==='informado'?'pago informado, pendiente de conciliación':'pendiente de pago'}</div>
    {debt.referencia_pago&&<small>Referencia informada: {debt.referencia_pago}</small>}
    {debt.estado!=='informado'&&<><Button variant="primary" className="provider-primary provider-wide" disabled={busy===`pix:${debt.id}`} onClick={()=>void startPix(debt)}>{busy===`pix:${debt.id}`?'Generando Pix…':'PAGAR UGO · PIX'}</Button><Button variant="secondary" className="provider-secondary provider-wide" disabled={busy===debt.id} onClick={()=>void reportPaid(debt.id)}>{busy===debt.id?'Informando…':'YA PAGUÉ · INFORMAR REFERENCIA'}</Button></>}
   </article>)}</div>
  </Card>}

  {message&&<div className="provider-simple-status" role="status"><span>{message}</span></div>}
  <article className="provider-withdraw-guide"><span>1</span><div><strong>{t('screen.earnings.19')}</strong><p>{t('screen.earnings.20')}</p></div><span>2</span><div><strong>{t('screen.earnings.21')}</strong><p>{t('screen.earnings.22')}</p></div><span>3</span><div><strong>{t('screen.earnings.23')}</strong><p>{t('screen.earnings.24')}</p></div></article>
  <ProviderPayoutPanel accessToken={d.accessToken}/>
  <Button variant="secondary" className="provider-secondary provider-wide" onClick={flow.actions.openHistory}>{t('screen.earnings.25')}</Button>
 {dialog}
 </section>
}
