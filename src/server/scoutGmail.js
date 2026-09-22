import { createClient } from '@supabase/supabase-js';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SUPABASE_URL=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'https://tmossnqfwfwjrtzwcbmm.supabase.co';
const SERVICE_KEY=process.env.UGO_TEST_SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'';
const GMAIL_SCOPE='openid email https://www.googleapis.com/auth/gmail.send';
const PRIMARY_CONNECTION='primary';

function bearer(req){const raw=String(req.headers?.authorization||'');return raw.startsWith('Bearer ')?raw.slice(7).trim():''}
function serviceClient(){
  if(!SERVICE_KEY)throw Object.assign(new Error('UGO TEST service key no configurada.'),{status:503});
  return createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function requireAdmin(req){
  const token=bearer(req);if(!token)throw Object.assign(new Error('Sesión Admin requerida.'),{status:401});
  const sb=serviceClient();
  const{data,error}=await sb.auth.getUser(token);
  if(error||!data?.user)throw Object.assign(new Error('Sesión inválida o vencida.'),{status:401});
  const{data:profile,error:profileError}=await sb.from('usuarios').select('tipo,activo').eq('id',data.user.id).maybeSingle();
  if(profileError)throw profileError;
  if(!profile?.activo||!['admin','superadmin'].includes(String(profile.tipo)))throw Object.assign(new Error('Acceso Admin requerido.'),{status:403});
  return{user:data.user,sb};
}
function googleConfig(req){
  const clientId=String(process.env.SCOUT_GMAIL_CLIENT_ID||process.env.GOOGLE_GMAIL_CLIENT_ID||process.env.GOOGLE_CALENDAR_CLIENT_ID||'').trim();
  const clientSecret=String(process.env.SCOUT_GMAIL_CLIENT_SECRET||process.env.GOOGLE_GMAIL_CLIENT_SECRET||process.env.GOOGLE_CALENDAR_CLIENT_SECRET||'').trim();
  const stateSecret=String(process.env.SCOUT_GMAIL_STATE_SECRET||process.env.GOOGLE_GMAIL_STATE_SECRET||process.env.GOOGLE_CALENDAR_STATE_SECRET||clientSecret).trim();
  const configured=Boolean(clientId&&clientSecret&&stateSecret&&SERVICE_KEY);
  const explicit=String(process.env.SCOUT_GMAIL_REDIRECT_URI||process.env.GOOGLE_GMAIL_REDIRECT_URI||'').trim();
  const publicBase=String(process.env.UGO_PUBLIC_BASE_URL||'').trim().replace(/\/$/,'');
  const forwardedProto=String(req.headers?.['x-forwarded-proto']||'https').split(',')[0].trim();
  const forwardedHost=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').split(',')[0].trim();
  const inferred=forwardedHost?`${forwardedProto}://${forwardedHost}/api/scout/gmail`:'';
  const redirectUri=explicit||(publicBase?`${publicBase}/api/scout/gmail`:inferred);
  const returnUrl=publicBase?`${publicBase}/?app=admin&scout_gmail=connected`:'/?app=admin&scout_gmail=connected';
  return{clientId,clientSecret,stateSecret,configured,redirectUri,returnUrl};
}
function b64url(value){return Buffer.from(value,'utf8').toString('base64url')}
function signState(payload,secret){
  const body=b64url(JSON.stringify(payload));
  const sig=createHmac('sha256',secret).update(body).digest('base64url');
  return`${body}.${sig}`;
}
function verifyState(value,secret){
  const [body,sig]=String(value||'').split('.');
  if(!body||!sig)throw Object.assign(new Error('OAuth state inválido.'),{status:400});
  const expected=createHmac('sha256',secret).update(body).digest();
  const actual=Buffer.from(sig,'base64url');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Object.assign(new Error('OAuth state inválido.'),{status:400});
  const payload=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));
  if(!payload?.uid||Number(payload.exp||0)<Date.now())throw Object.assign(new Error('OAuth state vencido.'),{status:400});
  return payload;
}
async function tokenExchange(params){
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params),signal:AbortSignal.timeout(12000)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload?.access_token)throw Object.assign(new Error(payload?.error_description||payload?.error||'Google rechazó la autorización.'),{status:502});
  return payload;
}
async function accessToken(config,refreshToken){
  const payload=await tokenExchange({client_id:config.clientId,client_secret:config.clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'});
  return String(payload.access_token);
}
async function connection(sb){
  const{data,error}=await sb.from('scout_gmail_conexiones').select('id,google_email,refresh_token,scope,connected_by,connected_at,updated_at').eq('id',PRIMARY_CONNECTION).maybeSingle();
  if(error)throw error;
  return data||null;
}
async function callback(req,res){
  const config=googleConfig(req);
  if(!config.configured||!config.redirectUri)return res.status(503).send('Gmail OAuth no está configurado en UGO.');
  try{
    if(req.query?.error)throw new Error(String(req.query.error));
    const state=verifyState(req.query?.state,config.stateSecret);
    const code=String(req.query?.code||'').trim();if(!code)throw new Error('Google no devolvió código OAuth.');
    const sb=serviceClient();
    const token=await tokenExchange({code,client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.redirectUri,grant_type:'authorization_code'});
    const userResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(10000)});
    const userInfo=await userResponse.json().catch(()=>({}));
    const email=String(userInfo?.email||'').trim().toLowerCase();
    if(!userResponse.ok||!email)throw new Error('Google no devolvió el email de la cuenta conectada.');
    const current=await connection(sb);
    const refreshToken=String(token.refresh_token||current?.refresh_token||'').trim();
    if(!refreshToken)throw new Error('Google no devolvió refresh token. Volvé a conectar la cuenta con consentimiento.');
    const{error}=await sb.from('scout_gmail_conexiones').upsert({
      id:PRIMARY_CONNECTION,google_email:email,refresh_token:refreshToken,scope:String(token.scope||GMAIL_SCOPE),
      connected_by:String(state.uid),connected_at:current?.connected_at||new Date().toISOString(),updated_at:new Date().toISOString()
    },{onConflict:'id'});
    if(error)throw error;
    res.statusCode=302;res.setHeader('Location',config.returnUrl);return res.end();
  }catch(error){
    const publicBase=String(process.env.UGO_PUBLIC_BASE_URL||'').trim().replace(/\/$/,'');
    const target=(publicBase||'')+'/?app=admin&scout_gmail=error';
    res.statusCode=302;res.setHeader('Location',target);return res.end();
  }
}
function cleanEmail(value=''){const email=String(value||'').trim().toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:''}
function encodeHeader(value){return`=?UTF-8?B?${Buffer.from(String(value||''),'utf8').toString('base64')}?=`}
function rawMessage(to,subject,textBody){
  return Buffer.from([
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    String(textBody||'')
  ].join('\r\n'),'utf8').toString('base64url');
}
async function sendGmail(config,refreshToken,to,subject,textBody){
  const token=await accessToken(config,refreshToken);
  const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({raw:rawMessage(to,subject,textBody)}),signal:AbortSignal.timeout(15000)
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(payload?.error?.message||`Gmail respondió HTTP ${response.status}`),{status:response.status||502});
  return payload;
}
function mailText(template,row,zona='',inviteUrl=''){
  let text=String(template||'').replaceAll('{nombre}',row.nombre||'profissional').replaceAll('{categoria}',row.categoria||'serviços').replaceAll('{zona}',row.ciudad||zona||'sua região').replaceAll('{invite_url}',inviteUrl);
  if(inviteUrl&&!text.includes(inviteUrl))text+=`\n\nCadastre-se na UGO: ${inviteUrl}`;
  return text.slice(0,12000);
}
async function markContact(sb,row){
  const now=new Date(),next=new Date(now.getTime()+2*24*60*60*1000);
  const patch={
    estado:row.estado==='prospecto_pendiente'?'invitado':row.estado,
    pipeline_etapa:['nuevo','listo'].includes(row.pipeline_etapa)?'contactado':row.pipeline_etapa,
    contactado_at:row.contactado_at||now.toISOString(),ultimo_contacto_at:now.toISOString(),ultimo_canal:'email',
    contactos_intentos:Number(row.contactos_intentos||0)+1,proximo_contacto_at:next.toISOString()
  };
  const{error}=await sb.from('prospectos_scouts').update(patch).eq('id',row.id);if(error)throw error;
}
async function logSend(sb,{row,to,subject,userId,payload,error}){
  try{
    await sb.from('scout_email_envios').insert({
      prospecto_id:row?.id||null,to_email:to,subject,gmail_message_id:payload?.id||null,gmail_thread_id:payload?.threadId||null,
      estado:error?'failed':'sent',error:error?String(error).slice(0,1200):null,sent_by:userId
    });
  }catch{}
}
async function sendProspect(sb,config,conn,row,subject,template,zona,userId,baseUrl='',campaignId=null){
  const to=cleanEmail(row.email);
  if(!to)throw Object.assign(new Error('El prospecto no tiene un email válido.'),{status:400});
  if(row.no_contactar||row.estado==='rechazado')throw Object.assign(new Error('Este prospecto está marcado como no contactar.'),{status:409});
  if(campaignId){
    const{data:member}=await sb.from('scout_campaign_members').select('ultimo_envio_at').eq('campaign_id',campaignId).eq('prospecto_id',row.id).maybeSingle();
    if(member?.ultimo_envio_at&&Date.now()-new Date(member.ultimo_envio_at).getTime()<36*60*60*1000)return{ok:false,skipped:true,to};
  }
  const validInvite=row.invitation_token&&!row.invitation_revoked_at&&!row.invitation_claimed_at&&row.invitation_expires_at&&new Date(row.invitation_expires_at).getTime()>Date.now();
  const inviteUrl=validInvite&&baseUrl?`${baseUrl}${baseUrl.includes('?')?'&':'?'}app=recruit&invite=${encodeURIComponent(row.invitation_token)}`:'';
  const text=mailText(template,row,zona,inviteUrl);
  if(!text.trim())throw Object.assign(new Error('Falta el mensaje de reclutamiento.'),{status:400});
  try{
    const payload=await sendGmail(config,conn.refresh_token,to,subject,text);
    await markContact(sb,row);
    await logSend(sb,{row,to,subject,userId,payload});
    try{await sb.from('scout_contact_events').insert({prospecto_id:row.id,campaign_id:campaignId,canal:'email',tipo:'recruitment_sent',direccion:'out',estado:'sent',mensaje:text,metadata:{gmail_message_id:payload?.id||null,gmail_thread_id:payload?.threadId||null,invite_url:inviteUrl||null}})}catch{}
    if(campaignId){try{await sb.from('scout_campaign_members').update({estado:'enviado',ultimo_envio_at:new Date().toISOString(),error:null}).eq('campaign_id',campaignId).eq('prospecto_id',row.id)}catch{}}
    return{ok:true,id:payload?.id||null,threadId:payload?.threadId||null,to,inviteUrl:inviteUrl||null};
  }catch(error){
    await logSend(sb,{row,to,subject,userId,error:error instanceof Error?error.message:'Gmail error'});
    if(campaignId){try{await sb.from('scout_campaign_members').update({estado:'error',error:String(error instanceof Error?error.message:error).slice(0,300)}).eq('campaign_id',campaignId).eq('prospecto_id',row.id)}catch{}}
    throw error;
  }
}

export async function handleScoutGmail(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'&&(req.query?.code||req.query?.state||req.query?.error))return callback(req,res);
  let auth;try{auth=await requireAdmin(req);}catch(error){const status=Number(error?.status)||500;return res.status(status).json({error:error instanceof Error?error.message:'Scout Gmail authorization failed'});}
  const config=googleConfig(req);
  if(req.method==='GET'){
    try{
      const conn=await connection(auth.sb);
      return res.status(200).json({configured:config.configured&&Boolean(config.redirectUri),connected:Boolean(conn),email:conn?.google_email||null,updatedAt:conn?.updated_at||null,redirectUri:config.redirectUri||null});
    }catch(error){return res.status(500).json({error:error instanceof Error?error.message:'No se pudo leer Gmail Scout.'});}
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{}),action=String(body.action||'status');
  try{
    if(action==='start'){
      if(!config.configured||!config.redirectUri)throw Object.assign(new Error('Faltan credenciales OAuth de Gmail en el servidor.'),{status:503});
      const state=signState({uid:auth.user.id,exp:Date.now()+10*60*1000,nonce:randomBytes(12).toString('hex')},config.stateSecret);
      const params=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:GMAIL_SCOPE,access_type:'offline',prompt:'consent',include_granted_scopes:'true',state});
      return res.status(200).json({url:`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`});
    }
    if(action==='disconnect'){
      const conn=await connection(auth.sb);
      if(conn?.refresh_token)await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(conn.refresh_token)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(8000)}).catch(()=>undefined);
      const{error}=await auth.sb.from('scout_gmail_conexiones').delete().eq('id',PRIMARY_CONNECTION);if(error)throw error;
      return res.status(200).json({connected:false});
    }
    const conn=await connection(auth.sb);
    if(!conn)throw Object.assign(new Error('Conectá una cuenta Gmail antes de enviar invitaciones.'),{status:409});
    if(!config.configured)throw Object.assign(new Error('Gmail OAuth no está configurado en el servidor.'),{status:503});
    const subject=String(body.subject||'UGO · Convite para profissionais').trim().slice(0,180);
    const template=String(body.message||'').trim(),zona=String(body.zona||''),baseUrl=String(body.base_url||''),campaignId=body.campaign_id?String(body.campaign_id):null;
    if(action==='send'){
      const id=String(body.prospectId||'');if(!id)throw Object.assign(new Error('prospectId requerido.'),{status:400});
      const{data:row,error}=await auth.sb.from('prospectos_scouts').select('id,nombre,categoria,email,ciudad,estado,pipeline_etapa,contactos_intentos,contactado_at,no_contactar,invitation_token,invitation_expires_at,invitation_revoked_at,invitation_claimed_at').eq('id',id).maybeSingle();
      if(error)throw error;if(!row)throw Object.assign(new Error('Prospecto no encontrado.'),{status:404});
      const result=await sendProspect(auth.sb,config,conn,row,subject,template,zona,auth.user.id,baseUrl,campaignId);
      return res.status(200).json(result);
    }
    if(action==='send_campaign'){
      const ids=[...new Set((Array.isArray(body.ids)?body.ids:[]).map(String))].slice(0,20);
      if(!ids.length)throw Object.assign(new Error('Seleccioná al menos un prospecto con email.'),{status:400});
      const{data:rows,error}=await auth.sb.from('prospectos_scouts').select('id,nombre,categoria,email,ciudad,estado,pipeline_etapa,contactos_intentos,contactado_at,no_contactar,invitation_token,invitation_expires_at,invitation_revoked_at,invitation_claimed_at').in('id',ids);
      if(error)throw error;
      let sent=0,failed=0,skipped=0;const errors=[];
      for(const row of rows||[]){
        try{const result=await sendProspect(auth.sb,config,conn,row,subject,template,zona,auth.user.id,baseUrl,campaignId);if(result.skipped)skipped++;else sent++}
        catch(error){failed++;errors.push({id:row.id,error:error instanceof Error?error.message:'Gmail error'})}
      }
      return res.status(200).json({sent,failed,skipped,total:ids.length,errors:errors.slice(0,10)});
    }
    return res.status(400).json({error:'Acción Gmail Scout inválida.'});
  }catch(error){
    const status=Number(error?.status)||500;
    return res.status(status>=400&&status<600?status:500).json({error:error instanceof Error?error.message:'Scout Gmail action failed'});
  }
}
