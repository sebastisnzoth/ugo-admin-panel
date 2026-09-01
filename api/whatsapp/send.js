import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://trfsjuseqjxlhrxuvdsm.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const WA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || process.env.UGO_WHATSAPP_VERIFY_TOKEN || '';
const WA_HOOK_SECRET = process.env.UGO_WHATSAPP_WEBHOOK_SECRET || '';
const WA_GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODELS = Array.from(new Set([process.env.GEMINI_MODEL,'gemini-3.5-flash-lite','gemini-3.5-flash','gemini-3.7-flash'].filter(Boolean)));

const CATEGORY_KEYWORDS = {
  'aire-acondicionado':['aire acondicionado','ar condicionado','climatiza','split','ac '],
  electricidad:['electricista','electricidad','eletricista','elétrica','eletrica','tomada','disjuntor','luz'],
  jardineria:['jardin','jardín','jardim','jardinero','jardineiro','grama','poda'],
  limpieza:['limpieza','limpar','limpeza','faxina','faxineira','diarista'],
  montaje:['montaje','montagem','reparacion','reparación','reparo','marido de aluguel','mueble','móvel'],
  mudanzas:['mudanza','mudança','frete','flete','搬'],
  pintura:['pintor','pintura','pintar'],
  plomeria:['plomero','plomeria','plomería','encanador','hidraulica','hidráulica','cano','torneira','vazamento'],
};

function sbClient(){
  if(!SERVICE_KEY) throw Object.assign(new Error('SUPABASE_SERVICE_KEY no configurada'),{status:503});
  return createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
function cleanPhone(v=''){return String(v).replace(/\D/g,'');}
function bearer(req){const raw=String(req.headers?.authorization||'');return raw.startsWith('Bearer ')?raw.slice(7).trim():'';}
function sameOrigin(req){try{const origin=String(req.headers?.origin||'');if(!origin)return false;return new URL(origin).host===String(req.headers?.host||'');}catch{return false;}}
function hookAllowed(req){if(!WA_HOOK_SECRET)return true;return String(req.query?.hook||'')===WA_HOOK_SECRET;}
function yes(text){return /^(si|sí|sim|s|ok|dale|confirmo|confirmar|pode|fechado|isso|yes)$/i.test(String(text).trim());}
function no(text){return /^(no|não|nao|cancelar|cancela|parar|reset|reiniciar)$/i.test(String(text).trim());}
function statusIntent(text){return /\b(estado|status|acompanhar|acompanho|seguimiento|onde está|onde esta|como vai|meu pedido|mi pedido)\b/i.test(String(text));}
function parseBudget(text){const m=String(text).match(/(?:r\$|rs|brl|presupuesto|orçamento|orcamento)?\s*([0-9]{2,5}(?:[.,][0-9]{1,2})?)/i);if(!m)return null;const n=Number(m[1].replace('.','').replace(',','.'));return Number.isFinite(n)&&n>0?n:null;}
function fallbackCategory(text){const t=String(text).toLowerCase();for(const [slug,words] of Object.entries(CATEGORY_KEYWORDS))if(words.some(w=>t.includes(w)))return slug;return null;}
function isSpanish(text){return /\b(necesito|quiero|presupuesto|dirección|direccion|urgente|hoy|electricista|plomero|limpieza)\b/i.test(String(text));}
function langText(lang,es,pt){return String(lang).startsWith('es')?es:pt;}
function extractJson(text){const cleaned=String(text||'').replace(/```json/gi,'').replace(/```/g,'').trim();try{return JSON.parse(cleaned)}catch{}const a=cleaned.indexOf('{'),b=cleaned.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(cleaned.slice(a,b+1))}catch{}}return null;}
async function callGemini(body){if(!GEMINI_KEY)return null;let last=null;for(const model of GEMINI_MODELS){try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_KEY},body:JSON.stringify(body),signal:AbortSignal.timeout(7000)});const d=await r.json().catch(()=>({}));if(r.ok){const raw=d?.candidates?.[0]?.content?.parts?.map(p=>p?.text||'').join('')||'';return extractJson(raw)}last=d}catch(e){last=e}}console.warn('WhatsApp Hugo Gemini unavailable',last);return null;}
async function extractRequest(text,draft,categories){
  const allowed=categories.map(c=>c.slug);
  const prompt=`Analizá un mensaje de cliente para U.G.O., marketplace de servicios. No inventes datos. Categorías permitidas: ${allowed.join(', ')}. Borrador previo: ${JSON.stringify(draft||{})}. Mensaje: ${text}. Devolvé SOLO JSON: {"category_slug":string|null,"description":string|null,"address":string|null,"urgent":boolean|null,"budget":number|null,"language":"pt-BR"|"es"|null}. Si un dato no está explícito o claramente inferible, null.`;
  const ai=await callGemini({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.05,maxOutputTokens:220}});
  const budget=parseBudget(text);
  return {
    category_slug: allowed.includes(ai?.category_slug)?ai.category_slug:fallbackCategory(text),
    description: typeof ai?.description==='string'&&ai.description.trim()?ai.description.trim().slice(0,600):null,
    address: typeof ai?.address==='string'&&ai.address.trim()?ai.address.trim().slice(0,300):null,
    urgent: typeof ai?.urgent==='boolean'?ai.urgent:/\b(urgente|agora|ahora|hoje|hoy|emergencia|emergência)\b/i.test(text),
    budget: Number.isFinite(Number(ai?.budget))&&Number(ai.budget)>0?Number(ai.budget):budget,
    language: ai?.language==='es'||ai?.language==='pt-BR'?ai.language:(isSpanish(text)?'es':'pt-BR'),
  };
}
async function recordEvent(sb,messageId,phone,direction,type,payload){if(!messageId)return;await sb.from('whatsapp_eventos').upsert({message_id:messageId,telefono:phone,direccion:direction,tipo:type||'text',payload:payload||{}},{onConflict:'message_id'}).catch(()=>{});}
async function sendText(sb,to,message){
  if(!WA_TOKEN||!WA_PHONE_ID)throw Object.assign(new Error('WhatsApp Cloud API no configurada'),{status:503});
  const phone=cleanPhone(to);if(phone.length<10)throw Object.assign(new Error('Número inválido'),{status:400});
  const r=await fetch(`https://graph.facebook.com/${WA_GRAPH_VERSION}/${WA_PHONE_ID}/messages`,{method:'POST',headers:{Authorization:`Bearer ${WA_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:phone,type:'text',text:{body:String(message).slice(0,3500),preview_url:false}}),signal:AbortSignal.timeout(12000)});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d?.error?.message||`Meta ${r.status}`),{status:r.status,details:d?.error});
  const id=d?.messages?.[0]?.id||`out-${Date.now()}`;await recordEvent(sb,id,phone,'out','text',{text:message});return{id,to:phone};
}
async function authorizeOutbound(req,sb){
  const token=bearer(req);if(token){const{data}=await sb.auth.getUser(token);if(data?.user){const{data:p}=await sb.from('usuarios').select('tipo,activo').eq('id',data.user.id).maybeSingle();if(p?.activo&&['admin','superadmin'].includes(String(p.tipo)))return true;}}
  return sameOrigin(req)&&Boolean(req.body?.prospecto_id);
}
async function loadConversation(sb,phone,name){
  const{data}=await sb.from('whatsapp_conversaciones').select('*').eq('telefono',phone).maybeSingle();
  if(data)return data;
  const row={telefono:phone,nombre:name||null,idioma:'pt-BR',estado:'idle',borrador:{}};const{data:created,error}=await sb.from('whatsapp_conversaciones').insert(row).select().single();if(error)throw error;return created;
}
async function saveConversation(sb,phone,patch){const{error}=await sb.from('whatsapp_conversaciones').update({...patch,updated_at:new Date().toISOString()}).eq('telefono',phone);if(error)throw error;}
async function ensureWhatsappUser(sb,conv,phone,name){
  if(conv.usuario_id){const{data:u}=await sb.from('usuarios').select('id').eq('id',conv.usuario_id).maybeSingle();if(u)return conv.usuario_id;}
  const candidates=[phone,`+${phone}`];const{data:profile}=await sb.from('perfiles_cliente').select('usuario_id').in('telefono',candidates).limit(1).maybeSingle();if(profile?.usuario_id){await saveConversation(sb,phone,{usuario_id:profile.usuario_id});return profile.usuario_id;}
  let authUser=null;const phoneE164=`+${phone}`;const created=await sb.auth.admin.createUser({phone:phoneE164,phone_confirm:true,user_metadata:{source:'whatsapp',display_name:name||'Cliente WhatsApp'}});if(created.data?.user)authUser=created.data.user;
  if(!authUser&&created.error){const listed=await sb.auth.admin.listUsers({page:1,perPage:1000});authUser=listed.data?.users?.find(u=>u.phone===phoneE164)||null;if(!authUser)throw created.error;}
  const uid=authUser.id;await sb.from('usuarios').upsert({id:uid,nombre:name||'Cliente WhatsApp',tipo:'cliente',activo:true,pais:'BR'},{onConflict:'id'});await sb.from('perfiles_cliente').upsert({usuario_id:uid,telefono:phoneE164,contacto_preferido:'whatsapp',idioma_preferido:conv.idioma||'pt-BR'},{onConflict:'usuario_id'});await saveConversation(sb,phone,{usuario_id:uid,nombre:name||conv.nombre||null});return uid;
}
async function suggestedTariff(sb,categoryId){const{data}=await sb.from('perfiles_proveedor').select('tarifa_base').eq('categoria_principal_id',categoryId).eq('disponible',true).not('tarifa_base','is',null).limit(30);const nums=(data||[]).map(x=>Number(x.tarifa_base)).filter(n=>Number.isFinite(n)&&n>0);if(!nums.length)return null;return Math.round((nums.reduce((a,b)=>a+b,0)/nums.length)*100)/100;}
async function statusReply(sb,conv){
  let id=conv.ultimo_servicio_id;if(!id&&conv.usuario_id){const{data:s}=await sb.from('servicios').select('id').eq('cliente_id',conv.usuario_id).order('created_at',{ascending:false}).limit(1).maybeSingle();id=s?.id||null;}if(!id)return langText(conv.idioma,'Todavía no tenés un servicio creado por WhatsApp.','Você ainda não tem um serviço criado pelo WhatsApp.');
  const{data:s}=await sb.from('servicios').select('numero,estado,direccion_cliente,tarifa,moneda,proveedor:usuarios!servicios_proveedor_id_fkey(nombre)').eq('id',id).maybeSingle();if(!s)return langText(conv.idioma,'No encontré el último servicio.','Não encontrei o último serviço.');const provider=Array.isArray(s.proveedor)?s.proveedor[0]:s.proveedor;return langText(conv.idioma,`Servicio #${s.numero}: ${String(s.estado).replaceAll('_',' ')}${provider?.nombre?` · ${provider.nombre}`:''}.`,`Serviço #${s.numero}: ${String(s.estado).replaceAll('_',' ')}${provider?.nombre?` · ${provider.nombre}`:''}.`);
}
async function createService(sb,conv,phone,name,messageId){
  const draft=conv.borrador||{};const{data:cat}=await sb.from('categorias').select('id,slug,nombre').eq('slug',draft.category_slug).eq('activa',true).maybeSingle();if(!cat)throw new Error('Categoría inválida');
  const uid=await ensureWhatsappUser(sb,conv,phone,name);const tarifa=Number(draft.budget||draft.suggested_tariff||0);if(!tarifa)throw new Error('Falta tarifa');const comision=Math.round(tarifa*.15*100)/100,ganancia=Math.round((tarifa-comision)*100)/100;const location=draft.location&&Number.isFinite(Number(draft.location.latitude))&&Number.isFinite(Number(draft.location.longitude))?`POINT(${Number(draft.location.longitude)} ${Number(draft.location.latitude)})`:null;
  const row={cliente_id:uid,categoria_id:cat.id,estado:'borrador',descripcion:String(draft.description).slice(0,800),urgencia:Boolean(draft.urgent),direccion_cliente:draft.address||'Ubicación compartida por WhatsApp',ubicacion_cliente:location,tarifa,comision_ugo:comision,ganancia_proveedor:ganancia,moneda:'BRL',metadata:{source:'whatsapp',telefono:phone,whatsapp_message_id:messageId,tarifa_fuente:draft.budget?'cliente':'promedio_proveedores'}};
  const{data:service,error}=await sb.from('servicios').insert(row).select('id,numero,estado').single();if(error)throw error;const{data:offers,error:matchError}=await sb.rpc('iniciar_matching_backend',{p_servicio_id:service.id});if(matchError)throw matchError;await saveConversation(sb,phone,{estado:'idle',borrador:{},ultimo_servicio_id:service.id,usuario_id:uid,ultimo_mensaje_id:messageId});return{service,offers:offers||[],tarifa};
}
async function processInbound(sb,{phone,name,messageId,text,location,type}){
  const already=await sb.from('whatsapp_eventos').select('message_id').eq('message_id',messageId).maybeSingle();if(already.data)return;
  await recordEvent(sb,messageId,phone,'in',type,{text,location,name});let conv=await loadConversation(sb,phone,name);let draft={...(conv.borrador||{})};
  if(no(text)){await saveConversation(sb,phone,{estado:'idle',borrador:{},ultimo_mensaje_id:messageId});await sendText(sb,phone,langText(conv.idioma,'Listo, cancelé el borrador. Decime qué servicio necesitás.','Certo, cancelei o rascunho. Me diga qual serviço você precisa.'));return;}
  if(statusIntent(text)&&conv.estado==='idle'){await sendText(sb,phone,await statusReply(sb,conv));return;}
  if(conv.estado==='confirming'&&yes(text)){const result=await createService(sb,conv,phone,name,messageId);const count=result.offers.length;await sendText(sb,phone,langText(conv.idioma,`✅ Servicio #${result.service.numero} creado por R$ ${result.tarifa.toFixed(2)}. ${count?`Envié ${count} oferta${count===1?'':'s'} a profesionales.`:'Estoy buscando profesionales disponibles.'} Escribí “estado” cuando quieras.`,`✅ Serviço #${result.service.numero} criado por R$ ${result.tarifa.toFixed(2)}. ${count?`Enviei ${count} oferta${count===1?'':'s'} para profissionais.`:'Estou procurando profissionais disponíveis.'} Escreva “status” quando quiser.`));return;}
  if(conv.estado==='confirming'&&!yes(text)){await saveConversation(sb,phone,{estado:'collecting',ultimo_mensaje_id:messageId});await sendText(sb,phone,langText(conv.idioma,'Perfecto. Decime qué dato querés cambiar: servicio, dirección, urgencia o presupuesto.','Perfeito. Diga o que quer alterar: serviço, endereço, urgência ou orçamento.'));return;}
  if(location){draft.location={latitude:Number(location.latitude),longitude:Number(location.longitude)};if(!draft.address)draft.address='Ubicación compartida por WhatsApp';}
  if(text){const{data:categories}=await sb.from('categorias').select('id,slug,nombre').eq('activa',true);const extracted=await extractRequest(text,draft,categories||[]);for(const k of ['category_slug','description','address','budget'])if(extracted[k]!=null)draft[k]=extracted[k];if(extracted.urgent!=null)draft.urgent=extracted.urgent;if(extracted.language){conv.idioma=extracted.language;await saveConversation(sb,phone,{idioma:extracted.language});}}
  await saveConversation(sb,phone,{estado:'collecting',borrador:draft,ultimo_mensaje_id:messageId,nombre:name||conv.nombre||null});
  if(!draft.category_slug){await sendText(sb,phone,langText(conv.idioma,'¿Qué necesitás? Electricidad, plomería, limpieza, pintura, jardinería, aire acondicionado, montaje/reparaciones o mudanza.','O que você precisa? Elétrica, hidráulica, limpeza, pintura, jardinagem, ar-condicionado, montagem/reparos ou mudança.'));return;}
  if(!draft.description){await sendText(sb,phone,langText(conv.idioma,'Contame brevemente qué problema hay o qué trabajo necesitás.','Conte brevemente qual é o problema ou serviço que você precisa.'));return;}
  if(!draft.address&&!draft.location){await sendText(sb,phone,langText(conv.idioma,'Pasame la dirección o compartí tu ubicación por WhatsApp.','Envie o endereço ou compartilhe sua localização pelo WhatsApp.'));return;}
  const{data:cat}=await sb.from('categorias').select('id,nombre').eq('slug',draft.category_slug).maybeSingle();if(!cat){draft.category_slug=null;await saveConversation(sb,phone,{borrador:draft});await sendText(sb,phone,langText(conv.idioma,'No pude identificar la categoría. Decime qué profesional necesitás.','Não consegui identificar a categoria. Diga qual profissional você precisa.'));return;}
  if(!draft.budget&&!draft.suggested_tariff){const avg=await suggestedTariff(sb,cat.id);if(avg){draft.suggested_tariff=avg;await saveConversation(sb,phone,{borrador:draft});}else{await sendText(sb,phone,langText(conv.idioma,'¿Qué presupuesto aproximado tenés en reales (R$)?','Qual orçamento aproximado você tem em reais (R$)?'));return;}}
  const tarifa=Number(draft.budget||draft.suggested_tariff);await saveConversation(sb,phone,{estado:'confirming',borrador:draft});const address=draft.address||'ubicación compartida';await sendText(sb,phone,langText(conv.idioma,`Confirmo: ${cat.nombre} · ${draft.description} · ${address}${draft.urgent?' · URGENTE':''} · R$ ${tarifa.toFixed(2)}. ¿Creo el pedido? Respondé SÍ o NO.`,`Confirmando: ${cat.nombre} · ${draft.description} · ${address}${draft.urgent?' · URGENTE':''} · R$ ${tarifa.toFixed(2)}. Posso criar o pedido? Responda SIM ou NÃO.`));
}
function inboundMessages(body){const out=[];for(const entry of body?.entry||[])for(const change of entry?.changes||[]){const value=change?.value||{};for(const msg of value.messages||[]){const contact=(value.contacts||[]).find(c=>c.wa_id===msg.from)||(value.contacts||[])[0]||{};out.push({phone:cleanPhone(msg.from),name:contact?.profile?.name||null,messageId:String(msg.id||''),type:msg.type||'unknown',text:msg.text?.body||msg.button?.text||msg.interactive?.button_reply?.title||msg.interactive?.list_reply?.title||'',location:msg.location||null,phoneNumberId:String(value?.metadata?.phone_number_id||'')});}}return out;}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Access-Control-Allow-Headers','content-type,authorization');const origin=String(req.headers?.origin||'');if(origin&&sameOrigin(req))res.setHeader('Access-Control-Allow-Origin',origin);
  if(req.method==='OPTIONS')return res.status(200).end();
  if(req.method==='GET'){
    if(!hookAllowed(req))return res.status(403).send('forbidden');const mode=String(req.query?.['hub.mode']||''),token=String(req.query?.['hub.verify_token']||''),challenge=String(req.query?.['hub.challenge']||'');if(mode==='subscribe'&&WA_VERIFY_TOKEN&&token===WA_VERIFY_TOKEN)return res.status(200).send(challenge);return res.status(403).send('verification failed');
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const sb=sbClient();const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
    if(body?.object==='whatsapp_business_account'||Array.isArray(body?.entry)){
      if(!hookAllowed(req))return res.status(403).json({received:false});const messages=inboundMessages(body);for(const m of messages){if(WA_PHONE_ID&&m.phoneNumberId&&m.phoneNumberId!==WA_PHONE_ID){console.warn('WhatsApp webhook phone id mismatch');continue;}if(!m.phone||!m.messageId)continue;try{await processInbound(sb,m)}catch(e){console.error('WhatsApp inbound processing failed',e);try{await sendText(sb,m.phone,'Hugo tuvo un problema procesando tu mensaje. Probá nuevamente en unos segundos.')}catch{}}}return res.status(200).json({received:true,count:messages.length});
    }
    const{to,message,prospecto_id}=body;if(!to||!message)return res.status(400).json({error:'to y message requeridos'});if(!(await authorizeOutbound(req,sb)))return res.status(401).json({error:'Acceso no autorizado para enviar WhatsApp.'});const sent=await sendText(sb,to,message);if(prospecto_id){await sb.from('invitaciones_scout').insert({prospecto_id,canal:'whatsapp',estado:'enviada',mensaje_hugo:message,fecha_envio:new Date().toISOString()}).catch(()=>{});await sb.from('prospectos_scouts').update({estado:'invitado'}).eq('id',prospecto_id).catch(()=>{});}return res.status(200).json({ok:true,message_id:sent.id,to:sent.to});
  }catch(e){console.error('WhatsApp endpoint error',e);const status=Number(e?.status)||500;return res.status(status>=400&&status<600?status:500).json({error:e instanceof Error?e.message:'Error interno'});}
}
