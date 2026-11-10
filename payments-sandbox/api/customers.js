import {timingSafeEqual} from 'node:crypto'
const BASE='https://api-sandbox.asaas.com/v3/customers?limit=2&offset=0'
const ID=/^cus_[A-Za-z0-9_-]{1,96}$/
function respond(res,status,body){
 res.statusCode=status
 res.setHeader('Content-Type','application/json')
 res.setHeader('Cache-Control','no-store')
 res.end(JSON.stringify(body))
}
function authorized(value,secret){
 if(typeof value!=='string'||typeof secret!=='string'||!value.startsWith('Bearer '))return false
 const a=Buffer.from(value.slice(7)),b=Buffer.from(secret)
 return a.length===b.length&&timingSafeEqual(a,b)
}
export default async function handler(req,res){
 if(req.method!=='GET')return respond(res,405,{error:'method_not_allowed'})
 if(process.env.VERCEL_ENV!=='preview'||process.env.UGO_PAYMENTS_TEST_ONLY!=='1')
  return respond(res,503,{error:'sandbox_disabled'})
 if(!process.env.UGO_TEST_OPERATOR_TOKEN)
  return respond(res,503,{error:'operator_auth_not_configured'})
 if(!authorized(req.headers.authorization,process.env.UGO_TEST_OPERATOR_TOKEN))
  return respond(res,401,{error:'unauthorized'})
 if(!process.env.ASAAS_SANDBOX_API_KEY)
  return respond(res,503,{error:'asaas_sandbox_credentials_missing'})
 try{
  const response=await fetch(BASE,{method:'GET',headers:{
   access_token:process.env.ASAAS_SANDBOX_API_KEY,
   accept:'application/json','User-Agent':'UGO-Pagamentos-V2-IsolatedTEST/0.1',
  },signal:AbortSignal.timeout(7000)})
  if(!response.ok)return respond(res,502,{error:'asaas_customer_audit_failed'})
  const data=await response.json()
  if(!Array.isArray(data?.data)||typeof data.hasMore!=='boolean')
   return respond(res,502,{error:'invalid_asaas_customer_list'})
  if(data.hasMore||data.data.length>1)
   return respond(res,409,{error:'multiple_customers_require_reconciliation'})
  if(data.data.length===0)return respond(res,200,{environment:'sandbox',found:false})
  const customerId=data.data[0]?.id
  if(typeof customerId!=='string'||!ID.test(customerId))
   return respond(res,502,{error:'invalid_customer_id'})
  return respond(res,200,{environment:'sandbox',found:true,customerId})
 }catch{
  return respond(res,502,{error:'asaas_customer_connection_failed'})
 }
}
