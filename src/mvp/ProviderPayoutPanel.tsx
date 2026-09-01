import React,{useCallback,useEffect,useState}from'react'
import{supabase}from'../lib/supabase'
import{money}from'./shared'

type Props={accessToken:string}
type Balance={total_liberado:number;total_retirado:number;saldo_disponible:number;saldo_procesando:number}
type Withdrawal={id:string;monto:number;moneda:string;estado:string;created_at:string;procesado_at?:string|null;transferencia_externa_id?:string|null}
type Payment={id:string;servicio_id:string;ganancia_proveedor:number;moneda:string;estado:string;liberado_at?:string|null;created_at:string}

export function ProviderPayoutPanel({accessToken}:Props){
 const[userId,setUserId]=useState(''),[account,setAccount]=useState('')
 const[balance,setBalance]=useState<Balance>({total_liberado:0,total_retirado:0,saldo_disponible:0,saldo_procesando:0})
 const[withdrawals,setWithdrawals]=useState<Withdrawal[]>([]),[payments,setPayments]=useState<Payment[]>([])
 const[amount,setAmount]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')

 const load=useCallback(async()=>{
  const{data:u}=await supabase.auth.getUser();if(!u.user)return;setUserId(u.user.id)
  const[{data:b,error:be},{data:w},{data:p},{data:profile}]=await Promise.all([
   (supabase as any).rpc('saldo_proveedor'),
   supabase.from('retiros').select('id,monto,moneda,estado,created_at,procesado_at,transferencia_externa_id').eq('proveedor_id',u.user.id).order('created_at',{ascending:false}).limit(30),
   supabase.from('pagos').select('id,servicio_id,ganancia_proveedor,moneda,estado,liberado_at,created_at').eq('proveedor_id',u.user.id).eq('estado','liberado').order('liberado_at',{ascending:false}).limit(30),
   supabase.from('perfiles_proveedor').select('cuenta_pago_externa').eq('usuario_id',u.user.id).maybeSingle(),
  ])
  if(be)throw be;const row=Array.isArray(b)?b[0]:b
  if(row)setBalance({total_liberado:Number(row.total_liberado||0),total_retirado:Number(row.total_retirado||0),saldo_disponible:Number(row.saldo_disponible||0),saldo_procesando:Number(row.saldo_procesando||0)})
  setWithdrawals((w||[])as Withdrawal[]);setPayments((p||[])as Payment[]);setAccount(String((profile as any)?.cuenta_pago_externa||''))
 },[])

 useEffect(()=>{load().catch(e=>setMessage(e.message||'No se pudo cargar ganancias.'))},[load])
 useEffect(()=>{if(!userId)return;const ch=supabase.channel(`provider-payouts-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'retiros',filter:`proveedor_id=eq.${userId}`},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`proveedor_id=eq.${userId}`},()=>load()).subscribe();return()=>{supabase.removeChannel(ch)}},[load,userId])

 async function saveAccount(){if(!userId)return;setBusy(true);const{error}=await supabase.from('perfiles_proveedor').update({cuenta_pago_externa:account.trim()||null}).eq('usuario_id',userId);setBusy(false);setMessage(error?error.message:'Cuenta de cobro guardada.')}
 async function requestWithdrawal(){const value=Number(amount);if(!Number.isFinite(value)||value<50)return setMessage('El retiro mínimo es R$ 50.');setBusy(true);setMessage('');try{const r=await fetch('/api/retiros/solicitar',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({monto:value})});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||'No se pudo solicitar el retiro.');setAmount('');setMessage('Retiro solicitado correctamente.');await load()}catch(e){setMessage(e instanceof Error?e.message:'No se pudo solicitar el retiro.')}finally{setBusy(false)}}

 return <div style={{marginTop:14}}><strong>💰 Ganancias y retiros</strong>
  <div style={{marginTop:8,fontSize:13}}>Disponible: <b>{money(balance.saldo_disponible)}</b> · En proceso: {money(balance.saldo_procesando)}</div>
  <label style={{display:'block',marginTop:10}}>Cuenta de cobro<input value={account} onChange={e=>setAccount(e.target.value)} placeholder="Mercado Pago / cuenta vinculada"/></label>
  <button type="button" className="mvp-voice-btn" onClick={saveAccount} disabled={busy}>Guardar cuenta</button>
  <label style={{display:'block',marginTop:10}}>Retirar<input type="number" min="50" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="50.00"/></label>
  <button type="button" className="mvp-voice-btn" onClick={requestWithdrawal} disabled={busy||balance.saldo_disponible<50}>{busy?'Procesando…':'Solicitar retiro'}</button>
  {message&&<div style={{marginTop:8,fontSize:12}}>{message}</div>}
  <details style={{marginTop:10}}><summary>Historial de retiros ({withdrawals.length})</summary>{withdrawals.map(w=><div key={w.id} style={{fontSize:12,padding:'6px 0'}}>{new Date(w.created_at).toLocaleDateString('pt-BR')} · {w.estado} · <b>{money(w.monto,w.moneda)}</b></div>)}</details>
  <details style={{marginTop:8}}><summary>Trabajos cobrados ({payments.length})</summary>{payments.map(p=><div key={p.id} style={{fontSize:12,padding:'6px 0'}}>{new Date(p.liberado_at||p.created_at).toLocaleDateString('pt-BR')} · <b>{money(p.ganancia_proveedor,p.moneda)}</b></div>)}</details>
 </div>
}
