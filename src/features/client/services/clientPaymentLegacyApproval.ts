import type{SupabaseClient}from'@supabase/supabase-js'
/** Legacy electronic held payments must retain the original settlement RPC. */
export async function hasExistingProtectedPayment(supabase:SupabaseClient,serviceId:string){
 const{data,error}=await supabase.from('pagos')
  .select('estado,mp_payment_id,pix_e2e_id,pago_externo_id')
  .eq('servicio_id',serviceId)
  .order('created_at',{ascending:false}).limit(2)
 if(error)throw error
 if((data||[]).length>1)throw new Error('Varios intentos de pago: requiere conciliación antes de aprobar.')
 const payment=data?.[0]
 return payment?.estado==='retenido'&&Boolean(payment.mp_payment_id||payment.pix_e2e_id||payment.pago_externo_id)
}
