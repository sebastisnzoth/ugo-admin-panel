import React,{useCallback,useEffect,useState}from'react'
import type{Session,SupabaseClient}from'@supabase/supabase-js'
import{money}from'./shared'

type Props={supabase:SupabaseClient;session:Session;account:string|null;onAccountChange:(value:string)=>void;onSaveAccount:()=>Promise<void>|void}
type Balance={total_liberado:number;total_retirado:number;saldo_disponible:number;saldo_procesando:number}
type Withdrawal={id:string;monto:number;moneda:string;estado:string;created_at:string;procesado_at?:string|null;transferencia_externa_id?:string|null}
type Payment={id:string;servicio_id:string;ganancia_proveedor:number;moneda:string;estado:string;liberado_at?:string|null;created_at:string}

export function ProviderPayoutPanel({supabase,session,account,onAccountChange,onSaveAccount}:Props){
 const[balance,setBalance]=useState<Balance>({total_liberado:0,total_retirado:0,saldo_disponible:0,saldo_procesando:0})
 const[withdrawals,setWithdrawals]=useState<Withdrawal[]>([])
 const[payments,setPayments]=useState<Payment[]>([])
 const[amount,setAmount]=useState('')
 const[busy,setBusy]=useState(false)
 const[message,setMessage]=useState('')

 const load=useCallback(async()=>{
  const[{data:b,error:be},{data:w},{data:p}]=await Promise.all([
   (supabase as any).rpc('saldo_proveedor'),
   supabase.from('retiros').select('id,monto,moneda,estado,created_at,procesado_at,transferencia_externa_id').eq('proveedor_id',session.user.id).order('created_at',{ascending:false}).limit(30),
   supabase.from('pagos').select('id,servicio_id,ganancia_proveedor,moneda,estado,liberado_at,created_at').eq('proveedor_id',session.user.id).eq('estado','liberado').order('liberado_at',{ascending:false}).limit(30),
  ])
  if(be)throw be
  const row=Array.isArray(b)?b[0]:b
  if(row)setBalance({total_liberado:Number(row.total_liberado||0),total_retirado:Number(row.total_retirado||0),saldo_disponible:Number(row.saldo_disponible||0),saldo_procesando:Number(row.saldo_procesando||0)})
  setWithdrawals((w||[]) as Withdrawal[]);setPayments((p||[]) as Payment[])
 },[session.user.id,supabase])

 useEffect(()=>{load().catch(e=>setMessage(e.message||'No se pudo cargar ganancias.'));const ch=supabase.channel(`provider-payouts-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'retiros',filter:`proveedor_id=eq.${session.user.id}`},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`proveedor_id=eq.${session.user.id}`},()=>load()).subscribe();return()=>{supabase.removeChannel(ch)}},[load,session.user.id,supabase])

 async function requestWithdrawal(){const value=Number(amount);if(!Number.isFinite(value)||value<50){setMessage('El retiro mínimo es R$ 50.');return}setBusy(true);setMessage('');try{const r=await fetch('/api/retiros/solicitar',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({monto:value})});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||'No se pudo solicitar el retiro.');setAmount('');setMessage('Retiro solicitado correctamente.');await load()}catch(e){setMessage(e instanceof Error?e.message:'No se pudo solicitar el retiro.')}finally{setBusy(false)}}

 return <div className="ugo-provider-panel">
  <h2>Ganancias</h2>
  <div className="ugo-provider-panel-card"><small>DISPONIBLE PARA RETIRAR</small><strong>{money(balance.saldo_disponible)}</strong><p>Total liberado: {money(balance.total_liberado)} · En proceso: {money(balance.saldo_procesando)}</p></div>
  <div className="ugo-provider-panel-card"><small>CUENTA DE COBRO</small><label>Mercado Pago / identificador externo<input value={account||''} onChange={e=>onAccountChange(e.target.value)} placeholder="Cuenta vinculada para cobros"/></label><button className="ugo-provider-primary" type="button" onClick={()=>onSaveAccount()}>Guardar cuenta</button></div>
  <div className="ugo-provider-panel-card"><small>SOLICITAR RETIRO</small><label>Monto<input type="number" min="50" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="50.00"/></label><button className="ugo-provider-primary" type="button" onClick={requestWithdrawal} disabled={busy||balance.saldo_disponible<50}>{busy?'Procesando…':'Solicitar retiro'}</button>{balance.saldo_disponible<50&&<p>Necesitás al menos R$ 50 disponibles.</p>}{message&&<p>{message}</p>}</div>
  <div className="ugo-provider-panel-card"><small>HISTORIAL DE RETIROS</small>{withdrawals.length===0?<p>Todavía no hay retiros.</p>:withdrawals.map(w=><div key={w.id} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,.08)'}}><span>{new Date(w.created_at).toLocaleDateString('pt-BR')} · {w.estado}</span><strong>{money(w.monto,w.moneda)}</strong></div>)}</div>
  <div className="ugo-provider-panel-card"><small>TRABAJOS COBRADOS</small>{payments.length===0?<p>Todavía no hay cobros liberados.</p>:payments.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,.08)'}}><span>{new Date(p.liberado_at||p.created_at).toLocaleDateString('pt-BR')} · Servicio {p.servicio_id.slice(0,8)}</span><strong>{money(p.ganancia_proveedor,p.moneda)}</strong></div>)}</div>
 </div>
}
