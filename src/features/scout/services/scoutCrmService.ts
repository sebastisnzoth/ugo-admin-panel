import{supabase}from'../../../lib/supabase'
import{legacyState,type Campaign,type DemandRow,type DuplicateGroup,type EventRow,type Prospect}from'../model'

export const SCOUT_CRM_SELECT_FIELDS='id,external_id,nombre,categoria,telefono,email,website,direccion,ciudad,pais,fuente,score_confianza,estado,notas_hugo,created_at,updated_at,contactado_at,aprobado_at,pipeline_etapa,recruitment_score,contactos_intentos,ultimo_canal,ultimo_contacto_at,proximo_contacto_at,no_contactar,invitation_token,invitation_expires_at,invitation_revoked_at,invitation_opened_at,invitation_claimed_at,converted_user_id,source_campaign_id'

export async function loadScoutCrmDashboard(){
 const prospects:Prospect[]=[]
 const pageSize=500
 for(let from=0;from<10000;from+=pageSize){
  const{data,error}=await(supabase as any).from('prospectos_scouts').select(SCOUT_CRM_SELECT_FIELDS).order('updated_at',{ascending:false}).range(from,from+pageSize-1)
  if(error)throw error
  const page=(data||[])as Prospect[]
  prospects.push(...page)
  if(page.length<pageSize)break
 }
 const[{data:d,error:de},{data:c,error:ce},{data:du,error:due}]=await Promise.all([
  (supabase as any).from('scout_demanda_categorias').select('slug,nombre,emoji,pedidos_30d,proveedores_activos,brecha,prioridad').order('brecha',{ascending:false}),
  (supabase as any).from('scout_campaign_metrics').select('id,nombre,categoria,zona,canal,estado,created_at,total,enviados,respondieron,interesados,convertidos').order('created_at',{ascending:false}).limit(20),
  (supabase as any).from('scout_duplicate_groups').select('duplicate_key,total,prospect_ids').limit(200)
 ])
 if(de)throw de
 if(ce)throw ce
 if(due)throw due
 return{prospects,demand:(d||[])as DemandRow[],campaigns:(c||[])as Campaign[],duplicates:(du||[])as DuplicateGroup[]}
}

export async function loadProspectHistory(id:string){
 const{data,error}=await(supabase as any).from('scout_contact_events').select('id,canal,tipo,direccion,estado,mensaje,metadata,created_at').eq('prospecto_id',id).order('created_at',{ascending:false}).limit(100)
 if(error)throw error
 return(data||[])as EventRow[]
}

export async function updateScoutProspect(id:string,patch:Record<string,unknown>){
 const{data,error}=await(supabase as any).from('prospectos_scouts').update(patch).eq('id',id).select(SCOUT_CRM_SELECT_FIELDS).single()
 if(error)throw error
 return data as Prospect
}

export async function updateScoutProspectStage(prospect:Prospect,stage:string){
 const patch:Record<string,unknown>={pipeline_etapa:stage,estado:legacyState(stage)}
 if(stage==='aprobado'&&!prospect.aprobado_at)patch.aprobado_at=new Date().toISOString()
 const{error}=await(supabase as any).from('prospectos_scouts').update(patch).eq('id',prospect.id)
 if(error)throw error
}

export async function createScoutCampaign(input:{nombre:string;categoria:string|null;subject:string;message:string;createdBy:string|null;prospectIds:string[]}){
 const{data,error}=await(supabase as any).from('scout_campaigns').insert({nombre:input.nombre,categoria:input.categoria,zona:null,canal:'mixto',asunto:input.subject,mensaje:input.message,estado:'activa',created_by:input.createdBy}).select('id').single()
 if(error)throw error
 const{error:membersError}=await(supabase as any).from('scout_campaign_members').insert(input.prospectIds.map(prospecto_id=>({campaign_id:data.id,prospecto_id})))
 if(membersError)throw membersError
 return String(data.id)
}

export async function bulkUpdateScoutProspects(ids:string[],patch:Record<string,unknown>){
 const{error}=await(supabase as any).from('prospectos_scouts').update(patch).in('id',ids)
 if(error)throw error
}

export async function issueScoutInvitation(prospectId:string,campaignId:string|null,days=14){
 const{data,error}=await(supabase as any).rpc('admin_issue_scout_invitation',{p_prospecto:prospectId,p_campaign:campaignId,p_days:days})
 if(error)throw error
 const row=Array.isArray(data)?data[0]:data
 if(!row?.token)throw new Error('No se pudo generar la invitación.')
 return{token:String(row.token),expiresAt:row.expires_at?String(row.expires_at):null}
}
