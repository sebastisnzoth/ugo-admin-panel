import{createClient}from'@supabase/supabase-js';
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'';
if(!url.includes('tmossnqfwfwjrtzwcbmm.supabase.co'))throw new Error('UGO TEST guard failed');
if(!key)throw new Error('UGO_TEST_SUPABASE_SERVICE_ROLE_KEY required');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const{data:sid,error}=await db.rpc('autonomous_qa_run_p0_test_service');if(error)throw error;if(!sid)throw new Error('P0_SERVICE_ID_REQUIRED');
const{data:s,error:se}=await db.from('servicios').select('id,estado,ambiente,proveedor_id').eq('id',sid).single();if(se)throw se;
const[{count:ev},{count:ratings},{data:pay,error:pe}]=await Promise.all([db.from('evidencias_servicio').select('id',{count:'exact',head:true}).eq('servicio_id',sid),db.from('resenas').select('id',{count:'exact',head:true}).eq('servicio_id',sid),db.from('pagos').select('metodo,fecha_confirmacion,estado').eq('servicio_id',sid).limit(1)]);
if(pe)throw pe;if(s.ambiente!=='demo'||s.estado!=='completado'||!s.proveedor_id||ev<2||ratings<2||!pay?.length||pay[0].metodo!=='efectivo'||!pay[0].fecha_confirmacion)throw new Error('P0_PERSISTED_VERIFICATION_FAILED');
console.log('UGO TEST P0 persisted service verified',sid);
const{data:job,error:jobError}=await db.rpc('autonomous_record_p0_journey_test',{p_service_id:sid});
if(jobError)throw jobError;
if(job.status!=='SUCCEEDED'||job.service_id!==sid||job.verification_result?.passed!==true||
   job.verification_result?.simulated_service!==true||job.verification_result?.physical_gps_verified!==false||
   job.verification_result?.uploaded_media_verified!==false||job.verification_result?.customer_acceptance!==false){
  throw new Error('P0_JOURNEY_TESTER_NOT_VERIFIED');
}
const[{count:decisions,error:de},{count:evidence,error:ee}]=await Promise.all([
  db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
  db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id)
]);
if(de)throw de;if(ee)throw ee;
if(decisions!==1||evidence!==1)throw new Error('P0_JOURNEY_TESTER_LEDGER_INCOMPLETE');
console.log('UGO TEST P0 Journey Tester persisted job and ledgers verified',sid);
