import{googleAuthorizeUrl,httpError,requireProvider,signState,type ApiReq,type ApiRes}from'./_shared'

export default async function handler(req:ApiReq,res:ApiRes){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET')return res.status(405).json({error:'Método no permitido.'})
 try{const{userId}=await requireProvider(req);return res.status(200).json({url:googleAuthorizeUrl(req,signState(userId))})}
 catch(error){return httpError(res,error)}
}
