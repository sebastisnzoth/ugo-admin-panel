import React,{useCallback,useEffect,useMemo,useState}from'react'
import{useLocale}from'../i18n/locale'
import{subscribeRealtimeChannel}from'../lib/realtimeChannel'
import{getRoleSupabase}from'../lib/roleSupabase'
import{ProviderMercadoPagoConnect}from'./ProviderMercadoPagoConnect'
import'./provider-payout.css'

type Props={accessToken:string}
type Balance={total_liberado:number;total_retirado:number;saldo_disponible:number;saldo_procesando:number}
type Withdrawal={id:string;monto:number;moneda:string;estado:string;created_at:string;procesado_at?:string|null;transferencia_externa_id?:string|null}
type Payment={id:string;servicio_id:string;ganancia_proveedor:number;moneda:string;estado:string;metodo?:string|null;liberado_at?:string|null;created_at:string}

export function ProviderPayoutPanel({accessToken}:Props){
 const{t,locale}=useLocale()
 const formatMoney=(value:number,currency='BRL')=>new Intl.NumberFormat(locale,{style:'currency',currency:/^[A-Z]{3}$/i.test(currency)?currency:'BRL'}).format(Number(value||0))
 const supabase=useMemo(()=>getRoleSupabase('provider'),[])
 const[userId,setUserId]=useState(''),[account,setAccount]=useState('')
 const[balance,setBalance]=useState<Balance>({total_liberado:0,total_retirado:0,saldo_disponible:0,saldo_procesando:0})
 const[withdrawals,setWithdrawals]=useState<Withdrawal[]>([]),[payments,setPayments]=useState<Payment[]>([])
 const[amount,setAmount]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')

 const load=useCallback(async()=>{
  const{data:u}=await supabase.auth.getUser();if(!u.user)return;setUserId(u.user.id)
  const[{data:b,error:be},{data:w},{data:p},{data:profile}]=await Promise.all([
   (supabase as any).rpc('saldo_proveedor'),
   supabase.from('retiros').select('id,monto,moneda,estado,created_at,procesado_at,transferencia_externa_id').eq('proveedor_id',u.user.id).order('created_at',{ascending:false}).limit(30),
   supabase.from('pagos').select('id,servicio_id,ganancia_proveedor,moneda,estado,metodo,liberado_at,created_at').eq('proveedor_id',u.user.id).eq('estado','liberado').order('liberado_at',{ascending:false}).limit(100),
   supabase.from('perfiles_proveedor').select('cuenta_pago_externa').eq('usuario_id',u.user.id).maybeSingle(),
  ])
  if(be)throw be;const row=Array.isArray(b)?b[0]:b
  if(row)setBalance({total_liberado:Number(row.total_liberado||0),total_retirado:Number(row.total_retirado||0),saldo_disponible:Number(row.saldo_disponible||0),saldo_procesando:Number(row.saldo_procesando||0)})
  setWithdrawals((w||[])as Withdrawal[]);setPayments(((p||[])as Payment[]).filter(row=>row.metodo!=='efectivo').slice(0,30));setAccount(String((profile as any)?.cuenta_pago_externa||''))
 },[supabase])

 useEffect(()=>{load().catch(e=>setMessage(e.message||t('providerPayout.loadFailed')))},[load,t])
 const[channelEpoch,setChannelEpoch]=useState(0)
 useEffect(()=>{if(!userId)return;const ch=supabase.channel(`provider-payouts-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'retiros',filter:`proveedor_id=eq.${userId}`},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`proveedor_id=eq.${userId}`},()=>load());const dispose=subscribeRealtimeChannel(ch,supabase,{onSync:()=>load(),onReconnect:()=>setChannelEpoch(v=>v+1)});return()=>{dispose()}},[load,supabase,userId,channelEpoch])

 async function saveAccount(){if(!userId)return;setBusy(true);const{error}=await (supabase as any).from('perfiles_proveedor').update({cuenta_pago_externa:account.trim()||null}).eq('usuario_id',userId);setBusy(false);setMessage(error?error.message:t('providerPayout.accountSaved'))}
 async function requestWithdrawal(){const value=Number(amount);if(!Number.isFinite(value)||value<50)return setMessage(t('providerPayout.minWithdrawal'));if(value>balance.saldo_disponible)return setMessage(t('providerPayout.overBalance'));if(!account.trim())return setMessage(t('providerPayout.saveAccountFirst'));setBusy(true);setMessage('');try{const r=await fetch('/api/retiros/solicitar',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({monto:value})});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||t('providerPayout.requestFailed'));setAmount('');setMessage(t('providerPayout.withdrawRequested'));await load()}catch(e){setMessage(e instanceof Error?e.message:t('providerPayout.requestFailed'))}finally{setBusy(false)}}
 const statusLabel=(s:string)=>['pendiente','procesando','pagado','fallido'].includes(s)?t('providerPayout.status.'+s):s

 return <div className="ugo-provider-payout"><strong className="ugo-payout-title">{t('providerPayout.title')}</strong>
  <div style={{marginTop:8,fontSize:13}}>{t('providerPayout.available')}: <b>{formatMoney(balance.saldo_disponible)}</b> · {t('providerPayout.processing')}: {formatMoney(balance.saldo_procesando)}</div>
  <div style={{marginTop:4,fontSize:11,opacity:.7}}>{t('providerPayout.released')}: {formatMoney(balance.total_liberado)} · {t('providerPayout.withdrawn')}: {formatMoney(balance.total_retirado)}</div>
  <ProviderMercadoPagoConnect accessToken={accessToken}/>
  <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid #e5e7eb'}}><strong style={{fontSize:13}}>{t('providerPayout.manualLegacy')}</strong><p style={{fontSize:11,opacity:.7,lineHeight:1.4}}>{t('providerPayout.manualHelp')}</p></div>
  <label style={{display:'block',marginTop:10}}>{t('providerPayout.account')}<input value={account} onChange={e=>setAccount(e.target.value)} placeholder={t('providerPayout.accountPlaceholder')}/></label>
  <button type="button" className="mvp-voice-btn" onClick={saveAccount} disabled={busy}>{t('providerPayout.saveAccountButton')}</button>
  <label style={{display:'block',marginTop:10}}>{t('providerPayout.withdraw')}<input type="number" min="50" max={Math.max(50,balance.saldo_disponible)} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={t('providerPayout.withdrawPlaceholder')}/></label>
  <button type="button" className="mvp-voice-btn" onClick={requestWithdrawal} disabled={busy||balance.saldo_disponible<50}>{busy?t('providerPayout.processing'):t('providerPayout.request')}</button>
  <p style={{fontSize:11,opacity:.7,lineHeight:1.4}}>{t('providerPayout.pendingWarning')}</p>
  {message&&<div style={{marginTop:8,fontSize:12}}>{message}</div>}
  <details style={{marginTop:10}}><summary>{t('providerPayout.withdrawHistory',{count:withdrawals.length})}</summary>{withdrawals.map(w=><div key={w.id} style={{fontSize:12,padding:'6px 0'}}>{new Date(w.created_at).toLocaleDateString(locale)} · {statusLabel(w.estado)} · <b>{formatMoney(w.monto,w.moneda)}</b>{w.transferencia_externa_id?<small style={{display:'block',opacity:.65}}>{t('providerPayout.externalRef')} {w.transferencia_externa_id}</small>:null}</div>)}</details>
  <details style={{marginTop:8}}><summary>{t('providerPayout.digitalHistory',{count:payments.length})}</summary>{payments.map(p=><div key={p.id} style={{fontSize:12,padding:'6px 0'}}>{new Date(p.liberado_at||p.created_at).toLocaleDateString(locale)} · <b>{formatMoney(p.ganancia_proveedor,p.moneda)}</b></div>)}</details>
 </div>
}
