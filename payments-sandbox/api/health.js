import pg from 'pg'
const { Client } = pg
const json=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
export default async function handler(req,res){
 if(req.method!=='GET')return json(res,405,{error:'method_not_allowed'})
 if(process.env.VERCEL_ENV!=='preview'||process.env.UGO_PAYMENTS_TEST_ONLY!=='1')
   return json(res,503,{environment:'disabled'})
 const token=process.env.ASAAS_SANDBOX_WEBHOOK_TOKEN
 const webhookInboxConfigured=typeof token==='string'&&token.length>=32&&
   token.length<=255&&!/\\s/.test(token)
 const config=process.env.UGO_NEON_TEST_READONLY_URL
 if(!config)return json(res,503,{environment:'sandbox',testDatabase:'not_configured'})
 const db=new Client({connectionString:config,connectionTimeoutMillis:5000,
   query_timeout:5000,statement_timeout:5000})
 try{
  await db.connect()
  const r=await db.query(`select current_database() = 'neondb' as expected_database,
   to_regclass('ugo_payments_v2.payment_intents') is not null as payments_schema_exists,
   pg_has_role(current_user,'neon_superuser','member') as privileged`)
  const ok=r.rows.length===1&&r.rows[0].expected_database===true&&
    r.rows[0].payments_schema_exists===true&&r.rows[0].privileged===false
  return json(res,ok?200:503,{environment:'sandbox',testDatabase:ok?'ready':'not_ready',
    role:'read_only',financialWritesEnabled:!!process.env.UGO_NEON_TEST_WRITE_URL,writeApiRequiresOperatorAuth:true,webhookInboxConfigured,providerAuthenticatedCheckoutReady:false})
 }catch{
  return json(res,503,{environment:'sandbox',testDatabase:'unavailable',
    financialWritesEnabled:false})
 }finally{await db.end().catch(()=>{})}
}
