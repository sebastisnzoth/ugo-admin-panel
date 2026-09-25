import type{SupabaseClient}from'@supabase/supabase-js'

export type RatingRole='client'|'provider'
export type ServiceRatingResult={status:'saved'|'already_rated';idempotent:boolean;reconciled:boolean}

type ServiceRow={id:string;cliente_id:string|null;proveedor_id:string|null;estado:string}
type RatingRow={servicio_id:string;cliente_id:string;proveedor_id:string;autor_tipo:'cliente'|'proveedor';puntuacion:number;comentario:string|null}

export class ServiceRatingError extends Error{
 constructor(public code:'invalid_input'|'not_found_or_unauthorized'|'invalid_state'|'missing_participants'|'recovery_unverified'|'backend_error',message:string){
  super(message);this.name='ServiceRatingError'
 }
}

const authorType=(role:RatingRole)=>role==='client'?'cliente':'proveedor'
const normalizeComment=(value:string|null|undefined)=>{const comment=String(value||'').trim();if(comment.length>500)throw new ServiceRatingError('invalid_input','El comentario no puede superar 500 caracteres.');return comment||null}
const sameRating=(row:RatingRow,input:{score:number;comment:string|null})=>Number(row.puntuacion)===input.score&&String(row.comentario||'').trim()===(input.comment||'')

async function readOwnedCompletedService(supabase:SupabaseClient,userId:string,role:RatingRole,serviceId:string){
 const owner=role==='client'?'cliente_id':'proveedor_id'
 const{data,error}=await supabase.from('servicios').select('id,cliente_id,proveedor_id,estado').eq('id',serviceId).eq(owner,userId).maybeSingle()
 if(error)throw error
 const row=(data||null)as ServiceRow|null
 if(!row)throw new ServiceRatingError('not_found_or_unauthorized','No encontramos ese servicio para tu cuenta.')
 if(row.estado!=='completado')throw new ServiceRatingError('invalid_state','El servicio todavía no está completado.')
 if(!row.cliente_id||!row.proveedor_id)throw new ServiceRatingError('missing_participants','El servicio no tiene ambas partes identificadas.')
 return row as ServiceRow&{cliente_id:string;proveedor_id:string}
}

async function readExistingRating(supabase:SupabaseClient,service:ServiceRow&{cliente_id:string;proveedor_id:string},role:RatingRole){
 const{data,error}=await supabase.from('resenas').select('servicio_id,cliente_id,proveedor_id,autor_tipo,puntuacion,comentario').eq('servicio_id',service.id).eq('autor_tipo',authorType(role)).maybeSingle()
 if(error)throw error
 return(data||null)as RatingRow|null
}

export async function submitServiceRating(supabase:SupabaseClient,input:{userId:string;role:RatingRole;serviceId:string;score:number;comment?:string|null}):Promise<ServiceRatingResult>{
 const{userId,role,serviceId}=input
 if(!userId||!serviceId||!Number.isInteger(input.score)||input.score<1||input.score>5)throw new ServiceRatingError('invalid_input','La calificación debe ser de 1 a 5 estrellas.')
 const comment=normalizeComment(input.comment)
 const service=await readOwnedCompletedService(supabase,userId,role,serviceId)
 const existing=await readExistingRating(supabase,service,role)
 if(existing)return sameRating(existing,{score:input.score,comment})?{status:'saved',idempotent:true,reconciled:false}:{status:'already_rated',idempotent:true,reconciled:false}

 const payload:RatingRow={servicio_id:service.id,cliente_id:service.cliente_id,proveedor_id:service.proveedor_id,autor_tipo:authorType(role),puntuacion:input.score,comentario:comment}
 const{error}=await supabase.from('resenas').insert(payload)
 if(!error)return{status:'saved',idempotent:false,reconciled:false}

 try{
  const persisted=await readExistingRating(supabase,service,role)
  if(persisted)return sameRating(persisted,{score:input.score,comment})?{status:'saved',idempotent:true,reconciled:true}:{status:'already_rated',idempotent:true,reconciled:true}
 }catch(recoveryError){
  throw new ServiceRatingError('recovery_unverified',recoveryError instanceof Error?recoveryError.message:'No pudimos confirmar si la calificación quedó guardada.')
 }
 throw error instanceof Error?error:new ServiceRatingError('backend_error','No se pudo guardar la calificación.')
}
