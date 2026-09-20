import type{VercelRequest,VercelResponse}from'@vercel/node'
import{createClient}from'@supabase/supabase-js'

const SUPABASE_URL=process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY=process.env.SUPABASE_SERVICE_KEY
const UGO_PIX_KEY=process.env.UGO_PIX_KEY

function emv(id:string,value:string){return`${id}${String(value.length).padStart(2,'0')}${value}`}
function crc16(payload:string){let crc=0xffff;for(let i=0;i<payload.length;i+=1){crc^=payload.charCodeAt(i)<<8;for(let bit=0;bit<8;bit+=1)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff}return crc.toString(16).toUpperCase().padStart(4,'0')}
function ascii(value:string,max:number){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 .\-]/g,'').toUpperCase().slice(0,max)}
function buildPix(key:string,amount:number,txid:string){const merchant=emv('00','BR.GOV.BCB.PIX')+emv('01',key.trim()),additional=emv('05',ascii(txid,25)||'UGO'),base=emv('00','01')+emv('26',merchant)+emv('52','0000')+emv('53','986')+emv('54',amount.toFixed(2))+emv('58','BR')+emv('59','UGO SERVICOS')+emv('60','FLORIANOPOLIS')+emv('62',additional)+'6304';return`${base}${crc16(base)}`}

export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'})
 if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY)return res.status(503).json({error:'Backend de pagos no configurado.'})
 if(!UGO_PIX_KEY)return res.status(503).json({error:'El Pix de UGO todavía no está configurado. Podés pagar por el medio indicado por UGO e informar la referencia.'})
 const token=String(req.headers.authorization||'').startsWith('Bearer ')?String(req.headers.authorization).slice(7).trim():''
 if(!token)return res.status(401).json({error:'Sesión requerida.'})
 const debtId=typeof req.body?.deudaId==='string'?req.body.deudaId:''
 if(!debtId)return res.status(400).json({error:'Falta deudaId.'})
 try{
  const sb=createClient(SUPABASE_URL,SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const{data:auth,error:authError}=await sb.auth.getUser(token)
  if(authError||!auth.user)return res.status(401).json({error:'Sesión inválida o vencida.'})
  const{data:profile}=await sb.from('usuarios').select('tipo').eq('id',auth.user.id).maybeSingle()
  if(profile?.tipo!=='proveedor')return res.status(403).json({error:'Cuenta de proveedor requerida.'})
  const{data:debt,error}=await sb.from('deudas_ugo_proveedor').select('id,proveedor_id,servicio_id,saldo_pendiente,moneda,ambiente,estado,servicio:servicios!deudas_ugo_proveedor_servicio_id_fkey(numero)').eq('id',debtId).eq('proveedor_id',auth.user.id).maybeSingle()
  if(error)throw error
  if(!debt)return res.status(404).json({error:'Comisión pendiente no encontrada.'})
  if(debt.ambiente!=='real')return res.status(409).json({error:'Este pago no corresponde al ambiente real.'})
  if(['pagado','anulado'].includes(String(debt.estado)))return res.status(409).json({error:'Esta comisión ya no está pendiente.'})
  if(String(debt.estado)==='informado')return res.status(409).json({error:'Este pago ya fue informado y está pendiente de conciliación.'})
  if(String(debt.moneda||'BRL')!=='BRL')return res.status(409).json({error:'El pago Pix a UGO está disponible sólo para deudas en BRL.'})
  const amount=Math.round(Number(debt.saldo_pendiente||0)*100)/100
  if(!Number.isFinite(amount)||amount<=0)return res.status(409).json({error:'La comisión no tiene saldo pendiente.'})
  const txid=`UGOD${String(debt.id).replace(/-/g,'').slice(0,21)}`
  const pixCopiaCola=buildPix(UGO_PIX_KEY,amount,txid)
  const service=Array.isArray(debt.servicio)?debt.servicio[0]:debt.servicio
  return res.status(200).json({success:true,deudaId:debt.id,servicioId:debt.servicio_id,servicioNumero:service?.numero||null,monto:amount,moneda:'BRL',pixCopiaCola,pixChave:UGO_PIX_KEY,txid})
 }catch(error){console.error('Error generando Pix de deuda UGO:',error);return res.status(500).json({error:error instanceof Error?error.message:'No se pudo generar el pago a UGO.'})}
}
