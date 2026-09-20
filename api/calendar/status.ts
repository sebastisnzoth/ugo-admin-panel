import{connectionFor,googleConfigured,httpError,requireProvider,type ApiReq,type ApiRes}from'./_shared'

export default async function handler(req:ApiReq,res:ApiRes){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET')return res.status(405).json({error:'Método no permitido.'})
 try{const{userId,admin}=await requireProvider(req);const connection=await connectionFor(admin,userId);return res.status(200).json({configured:googleConfigured(),connected:Boolean(connection),email:connection?.google_email||null,calendarId:connection?.calendar_id||null,updatedAt:connection?.updated_at||null})}
 catch(error){return httpError(res,error)}
}
