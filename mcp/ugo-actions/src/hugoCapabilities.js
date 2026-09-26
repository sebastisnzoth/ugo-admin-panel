const CAPABILITIES={
 client:{
  reads:['ugo_get_current_user','ugo_get_current_job','ugo_get_service','ugo_get_provider_location','ugo_get_saved_places','ugo_get_job_history'],
  actions:['ugo_approve_work','ugo_confirm_cash_payment','ugo_rate_service'],
  pending:['search_service','select_category','use_current_location','create_request','open_active_order','show_provider','show_map','cancel_request','select_payment'],
 },
 provider:{
  reads:['ugo_get_current_user','ugo_get_current_job','ugo_get_service','ugo_get_provider_location','ugo_get_provider_offers','ugo_get_job_history'],
  actions:['ugo_accept_job','ugo_start_route','ugo_mark_arrived','ugo_start_work','ugo_finish_work','ugo_rate_service'],
  pending:['reject_offer','publish_location','upload_initial_evidence','upload_final_evidence','show_debt','pay_ugo'],
 },
 admin:{
  reads:[],
  actions:[],
  pending:['search_user','search_provider','open_service','open_dispute','show_active_services','show_provider_location','show_operational_status'],
 },
}

export function getHugoCapabilities({role}){
 const value=CAPABILITIES[role]
 if(!value)throw new Error('unsupported_role')
 return{status:'ok',role,...value,rule:'Only tools listed in reads/actions are executable. pending capabilities must return capability_not_available until mapped to a real UGO operation.'}
}

export function validateHugoCapability({role,tool}){
 const value=CAPABILITIES[role]
 if(!value)return{status:'error',code:'unsupported_role'}
 if(value.reads.includes(tool)||value.actions.includes(tool))return{status:'ok',allowed:true,tool}
 return{status:'error',code:'capability_not_available',allowed:false,tool}
}
