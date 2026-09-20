import{appBase,exchangeCode,googleJson,httpError,redirectUri,serviceClient,verifyState,type ApiReq,type ApiRes}from'./_shared'

function query(req:ApiReq,key:string){const value=req.query?.[key];return Array.isArray(value)?value[0]:String(value||'')}
function redirect(res:ApiRes,url:string){res.status(302);res.setHeader('Location',url);res.end()}

export default async function handler(req:ApiReq,res:ApiRes){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET')return res.status(405).json({error:'Método no permitido.'})
 const base=appBase(req)
 try{
  const oauthError=query(req,'error');if(oauthError)return redirect(res,base+'/?app=provider&calendar=cancelled')
  const code=query(req,'code'),state=query(req,'state');if(!code||!state)throw Object.assign(new Error('Faltan datos de Google OAuth.'),{status:400})
  const userId=verifyState(state),tokens=await exchangeCode(req,code),accessToken=String(tokens.access_token||'');if(!accessToken)throw new Error('Google no devolvió un access token.')
  const admin=serviceClient(),{data:existing}=await admin.from('proveedor_calendar_conexiones').select('refresh_token').eq('proveedor_id',userId).maybeSingle()
  const refreshToken=String(tokens.refresh_token||existing?.refresh_token||'');if(!refreshToken)throw Object.assign(new Error('Google no entregó permiso offline. Volvé a conectar el calendario.'),{status:502})
  const userInfo=await googleJson(accessToken,'https://www.googleapis.com/oauth2/v3/userinfo'),email=String((userInfo as Record<string,unknown>)?.email||'')||null
  const{error}=await admin.from('proveedor_calendar_conexiones').upsert({proveedor_id:userId,google_email:email,calendar_id:'primary',refresh_token:refreshToken,scope:String(tokens.scope||'')||null,updated_at:new Date().toISOString()},{onConflict:'proveedor_id'})
  if(error)throw error
  return redirect(res,base+'/?app=provider&calendar=connected')
 }catch(error){
  console.error('UGO Google Calendar callback failed',error)
  if(base&&base!=='https://localhost')return redirect(res,base+'/?app=provider&calendar=error')
  return httpError(res,error)
 }
}
void redirectUri
