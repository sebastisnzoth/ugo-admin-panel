import{useLocale}from'../../i18n/locale'
import React,{useState}from'react'
import{ProviderPayoutPanel}from'../ProviderPayoutPanel'
import{useProviderData}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{Button,Card,SectionHeader,StatusPill,Textarea}from'../../shared/ui'
import{useDialog}from'../dialogs'
import{createProviderDebtPix,reportProviderDebtPaid,type ProviderPixDebtPayment}from'../../features/provider/services/providerEarningsService'

export function ProviderEarnings(){
 const{t,locale}=useLocale()
 const formatMoney=(value:number,currency='BRL')=>new Intl.NumberFormat(locale,{style:'currency',currency:/^[A-Z]{3}$/i.test(currency)?currency:'BRL'}).format(Number(value||0))
 const d=useProviderData(),flow=useProviderFlow()
 const[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[pix,setPix]=useState<ProviderPixDebtPayment|null>(null)
const{prompt,node:dialog}=useDialog()
 const pendingDebts=d.debts.filter(x=>x.ambiente==='real'&&!['pagado','anulado'].includes(x.estado)&&Number(x.saldo_pendiente||0)>0)
 const actionableDebt=pendingDebts.find(x=>x.estado!=='informado')||null
 async function reportPaid(id:string){
  const ref=await prompt({title:t('providerEarnings.promptTitle'),message:t('providerEarnings.promptMessage'),label:t('providerEarnings.promptLabel'),required:true})
  if(ref===null)return
  if(ref.trim().length<4){setMessage(t('providerEarnings.invalidReference'));return}
  setBusy(id);setMessage('')
  try{await reportProviderDebtPaid(id,ref)}catch(error){setBusy('');setMessage(error instanceof Error?error.message:t('providerEarnings.reportFailed'));return}
  setBusy('')
  setMessage(t('providerEarnings.reported'))
  if(pix?.deudaId===id)setPix(null)
  await d.reload()
 }
 async function startPix(debt:typeof pendingDebts[number]){
  setBusy(`pix:${debt.id}`);setMessage('')
  try{
   setPix(await createProviderDebtPix(d.accessToken,debt))
  }catch(error){setMessage(error instanceof Error?error.message:t('providerEarnings.pixFailed'))}
  finally{setBusy('')}
 }
 async function copyPix(){
  if(!pix?.pixCopiaCola)return
  try{await navigator.clipboard.writeText(pix.pixCopiaCola);setMessage(t('providerEarnings.copied'))}
  catch{void prompt({title:t('providerEarnings.pixTitle'),message:t('providerEarnings.pixCopyHelp'),label:t('providerEarnings.pixCopyLabel'),defaultValue:pix.pixCopiaCola})}
 }
 return <section className="provider-screen provider-earnings-complete" aria-labelledby="provider-earnings-title">
  <Button variant="ghost" className="provider-back" onClick={flow.actions.openProfile}>{t('screen.earnings.1')}</Button>
  <SectionHeader eyebrow={t('providerEarnings.eyebrow')} title={t('providerEarnings.title')} description={t('providerEarnings.description')} actions={<Button variant="ghost" onClick={flow.actions.openHistory}>{t('screen.earnings.2')}</Button>}/>
  <div className="provider-balance-grid">
   <article><small>{t('screen.earnings.3')}</small><strong>{formatMoney(d.released)}</strong><span>{t('screen.earnings.4')}</span></article>
   <article><small>{t('screen.earnings.5')}</small><strong>{formatMoney(d.retained)}</strong><span>{t('screen.earnings.6')}</span></article>
   <article><small>{t('screen.earnings.7')}</small><strong>{formatMoney(d.cashReceived)}</strong><span>{t('screen.earnings.8')}</span></article>
   <article className={d.ugoDebt>0?'provider-debt-card':''}><small>{t('screen.earnings.9')}</small><strong>{formatMoney(d.ugoDebt)}</strong><span>{d.debtBlocked?t('providerEarnings.debtLimit',{count:d.pendingDebtCount}):t('providerEarnings.cashCommission')}</span>{d.ugoDebt>0&&<Button variant="primary" className="provider-primary provider-wide" disabled={!actionableDebt||busy.startsWith('pix:')} onClick={()=>actionableDebt&&void startPix(actionableDebt)}>{actionableDebt?t('providerEarnings.payUgo'):t('providerEarnings.paymentReview')}</Button>}</article>
  </div>

  {d.debtBlocked&&<Card className="provider-debt-lock" role="alert"><StatusPill tone="danger">{t('screen.earnings.10')}</StatusPill><strong>{t('screen.earnings.11')}</strong><span>{t('providerEarnings.debtMessage',{count:d.pendingDebtCount})}</span></Card>}

  {pix&&<Card className="provider-card provider-debt-payment" aria-label={t('providerEarnings.pixAria')}><div><span className="provider-kicker">{t('screen.earnings.12')}</span><h2>{t('providerEarnings.serviceNumber',{number:pix.servicio})} · {formatMoney(pix.monto,pix.moneda)}</h2><p>{t('screen.earnings.13')}</p></div><Textarea readOnly value={pix.pixCopiaCola} aria-label={t('providerEarnings.pixCodeAria')}/><div className="provider-debt-payment-actions"><Button variant="primary" className="provider-primary" onClick={()=>void copyPix()}>{t('screen.earnings.14')}</Button><Button variant="secondary" className="provider-secondary" onClick={()=>setPix(null)}>{t('screen.earnings.15')}</Button></div><small>{t('providerEarnings.ugoKey')}: {pix.pixChave} · TXID {pix.txid}</small></Card>}

  {pendingDebts.length>0&&<Card className="provider-card" aria-label={t('providerEarnings.pendingCommissionsAria')}>
   <div className="provider-section-head"><div><span className="provider-kicker">{t('screen.earnings.16')}</span><h2 style={{margin:'4px 0'}}>{t('screen.earnings.17')}</h2><p>{t('screen.earnings.18')}</p></div></div>
   <div style={{display:'grid',gap:8}}>{pendingDebts.map(debt=><article key={debt.id} style={{border:'1px solid #dfe5e8',borderRadius:14,padding:12,display:'grid',gap:7}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'start'}}><div><small>{t('providerEarnings.serviceNumber',{number:debt.servicio?.numero||String(debt.servicio_id).slice(0,8)})}</small><strong style={{display:'block',marginTop:3}}>{t('providerEarnings.collected')} {formatMoney(debt.monto_servicio,debt.moneda)}</strong></div><strong style={{fontSize:18}}>{formatMoney(debt.saldo_pendiente,debt.moneda)}</strong></div>
    <div style={{fontSize:12,color:'#647269'}}>{t('providerEarnings.commissionLabel',{status:debt.estado==='informado'?t('providerEarnings.informedPending'):t('providerEarnings.pendingPayment')})}</div>
    {debt.referencia_pago&&<small>{t('providerEarnings.reportedReference',{reference:debt.referencia_pago})}</small>}
    {debt.estado!=='informado'&&<><Button variant="primary" className="provider-primary provider-wide" disabled={busy===`pix:${debt.id}`} onClick={()=>void startPix(debt)}>{busy===`pix:${debt.id}`?t('providerEarnings.generatingPix'):t('providerEarnings.payPix')}</Button><Button variant="secondary" className="provider-secondary provider-wide" disabled={busy===debt.id} onClick={()=>void reportPaid(debt.id)}>{busy===debt.id?t('providerEarnings.reporting'):t('providerEarnings.reportPayment')}</Button></>}
   </article>)}</div>
  </Card>}

  {message&&<div className="provider-simple-status" role="status"><span>{message}</span></div>}
  <article className="provider-withdraw-guide"><span>1</span><div><strong>{t('screen.earnings.19')}</strong><p>{t('screen.earnings.20')}</p></div><span>2</span><div><strong>{t('screen.earnings.21')}</strong><p>{t('screen.earnings.22')}</p></div><span>3</span><div><strong>{t('screen.earnings.23')}</strong><p>{t('screen.earnings.24')}</p></div></article>
  <ProviderPayoutPanel accessToken={d.accessToken}/>
  <Button variant="secondary" className="provider-secondary provider-wide" onClick={flow.actions.openHistory}>{t('screen.earnings.25')}</Button>
 {dialog}
 </section>
}
