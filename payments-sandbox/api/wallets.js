import {timingSafeEqual} from 'node:crypto'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const BASE='https://api-sandbox.asaas.com/v3/wallets/'
const json=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
function auth(token,configured){
 if(!token||!configured||typeof token!=='string'||typeof configured!=='string')return false
 const a=Buffer.from(token),b=Buffer.from(configured)
 return a.length===b.length&&timingSafeEqual(a,b)
}
export default async function handler(req,res){
 if(req.method!=='GET')return json(res,405,{error:'method_not_allowed'})
 if(process.env.VERCEL_ENV!=='preview'||process.env.UGO_PAYMENTS_TEST_ONLY!=='1')
  return json(res,503,{error:'sandbox_disabled'})
 const secret=process.env.UGO_TEST_OPERATOR_TOKEN
 if(!secret)return json(res,503,{error:'operator_auth_not_configured'})
 const header=String(req.headers.authorization||'')
 if(!header.startsWith('Bearer ')||!auth(header.slice(7),secret))
   return json(res,401,{error:'unauthorized'})
 const account=(req.query?.account||'issuer')
 if(account!=='issuer'&&account!=='provider')return json(res,400,{error:'invalid_account'})
 const apiKey=account==='issuer'?process.env.ASAAS_SANDBOX_API_KEY:
   process.env.ASAAS_PROVIDER_SANDBOX_API_KEY
 const expected=account==='issuer'?process.env.UGO_ASAAS_ISSUER_WALLET_ID:
   process.env.UGO_ASAAS_PROVIDER_WALLET_ID
 if(!apiKey||!UUID.test(expected||''))return json(res,503,{
  account,verified:false,error:'sandbox_wallet_credentials_missing'
 })
 try{
  const response=await fetch(BASE,{method:'GET',headers:{
   access_token:apiKey,accept:'application/json','User-Agent':'UGO-Pagamentos-V2-IsolatedTEST/0.1'
  },signal:AbortSignal.timeout(7000)})
  if(!response.ok)return json(res,502,{account,verified:false,error:'asaas_wallet_request_failed'})
  const data=await response.json()
  const wallets=Array.isArray(data?.data)?data.data:Array.isArray(data)?data:null
  if(!wallets||wallets.length!==1||!UUID.test(wallets[0]?.walletId)||
     wallets[0].walletId.toLowerCase()!==expected.toLowerCase())
   return json(res,409,{account,verified:false,error:'asaas_wallet_ownership_mismatch'})
  return json(res,200,{account,verified:true,environment:'sandbox',walletId:wallets[0].walletId})
 }catch{return json(res,502,{account,verified:false,error:'asaas_wallet_connection_failed'})}
}
