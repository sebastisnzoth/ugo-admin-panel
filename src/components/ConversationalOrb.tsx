import React,{useCallback,useEffect,useRef,useState}from'react';
import{supabase}from'../lib/supabase';

type OrbState='idle'|'listening'|'thinking'|'speaking';
type HugoRole='admin'|'superadmin';
type Msg={role:'hugo'|'user';text:string};
type ScoutCandidate={id:string;name:string;phone?:string;address?:string;lat:number;lng:number;dist:number;website?:string;source?:string;score:number};
type HugoUiAction={type:'navigate'|'open_service'|'refresh'|'map_filter';target?:string;service_id?:string;service_number?:number;status?:'todos'|'online'|'offline'|'inactivo';category?:string|null;zone?:string|null;place?:string|null;radius_m?:number|null;show_providers?:boolean|null;show_clients?:boolean|null};
type GeminiTts={audio_base64?:string;mime_type?:string;sample_rate?:number;error?:string;hugo_mensaje?:string};

const CSS=`
@keyframes hugoFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.025)}}
@keyframes hugoThink{to{transform:rotate(360deg)}}
@keyframes hugoPulse{0%,100%{box-shadow:0 4px 22px rgba(5,148,79,.38),0 0 0 0 rgba(5,148,79,.22)}50%{box-shadow:0 4px 30px rgba(5,148,79,.58),0 0 0 10px rgba(5,148,79,0)}}
.hugo-free-trigger{position:fixed;right:28px;bottom:28px;min-width:106px;height:48px;padding:0 15px 0 10px;border:0;border-radius:26px;cursor:pointer;z-index:8000;background:#053f27;color:#fff;display:flex;align-items:center;gap:9px;font:900 13px/1 Inter,system-ui,sans-serif;letter-spacing:.01em;box-shadow:0 6px 24px rgba(5,148,79,.34);animation:hugoPulse 2.8s ease-in-out infinite}
.hugo-free-trigger:before{content:'';width:29px;height:29px;flex:0 0 29px;border-radius:50%;background:radial-gradient(circle at 35% 28%,#10f38b,#05944F 48%,#013c22);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.hugo-free-trigger-role{display:block;margin-top:2px;font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.72)}
.hugo-free-overlay{position:fixed;inset:0;z-index:9500;background:rgba(247,248,249,.98);backdrop-filter:blur(18px);display:flex;flex-direction:column;align-items:center;color:#111;font-family:Inter,system-ui,sans-serif}
.hugo-free-head{width:100%;height:64px;display:flex;align-items:center;justify-content:center;position:relative;border-bottom:1px solid rgba(0,0,0,.06)}
.hugo-free-head strong{font-size:15px;font-weight:900}.hugo-free-head small{display:block;text-align:center;color:#05944F;font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-top:2px;font-weight:800}
.hugo-free-close{position:absolute;right:18px;top:15px;width:34px;height:34px;border:0;border-radius:50%;background:#eceeef;cursor:pointer;font-size:18px}
.hugo-free-orb-area{padding:20px 0 12px;display:flex;flex-direction:column;align-items:center;gap:10px}
.hugo-free-orb-wrap{position:relative;width:142px;height:142px;display:grid;place-items:center}.hugo-free-ring{position:absolute;inset:-12px;border:2px dashed rgba(39,110,241,.3);border-radius:50%;animation:hugoThink 2.3s linear infinite}.hugo-free-ring.hidden{display:none}
.hugo-free-orb{width:128px;height:128px;border-radius:50%;background:radial-gradient(circle at 34% 27%,#12f58c,#05944F 46%,#024d2c 72%,#012d1a);box-shadow:0 12px 38px rgba(5,148,79,.22);animation:hugoFloat 3s ease-in-out infinite}.hugo-free-orb.thinking{background:radial-gradient(circle at 34% 27%,#8dc0ff,#276EF1 48%,#173d91 75%,#0b2257)}
.hugo-free-status{height:20px;font-size:12px;color:#777}.hugo-free-status.active{color:#05944F}.hugo-free-status.thinking{color:#276EF1}
.hugo-free-feed{width:min(600px,94vw);flex:1;overflow:auto;padding:8px 16px 12px;display:flex;flex-direction:column;gap:8px}.hugo-msg{max-width:90%;padding:10px 14px;border-radius:17px;font-size:13px;line-height:1.5;white-space:pre-wrap}.hugo-msg.hugo{align-self:flex-start;background:#fff;border:1px solid rgba(0,0,0,.09);border-bottom-left-radius:5px}.hugo-msg.user{align-self:flex-end;background:#111;color:#fff;border-bottom-right-radius:5px}
.hugo-free-input{width:min(600px,94vw);padding:12px 16px 26px;display:flex;gap:8px;border-top:1px solid rgba(0,0,0,.06)}.hugo-free-input input{flex:1;border:1.5px solid rgba(0,0,0,.14);border-radius:24px;padding:11px 15px;font:inherit;outline:none;background:#fff}.hugo-free-input button{width:44px;height:44px;border:0;border-radius:50%;cursor:pointer;font-size:17px}.hugo-mic{background:#edf0f1}.hugo-mic.on{background:#E11900;color:#fff}.hugo-send{background:#111;color:#fff}.hugo-send:disabled{opacity:.35}.hugo-free-note{width:min(600px,94vw);font-size:9px;color:#8a8a8a;text-align:center;padding-bottom:8px}
@media(max-width:720px){.hugo-free-trigger{right:16px;bottom:78px}.hugo-free-orb{width:112px;height:112px}.hugo-free-orb-wrap{width:124px;height:124px}}
`;

function extractText(result:any){const content=result?.message?.content;if(typeof content==='string')return content.trim();if(Array.isArray(content))return content.map((p:any)=>typeof p==='string'?p:p?.text||'').join(' ').trim();return typeof result==='string'?result.trim():''}
function compactRows(rows:any[]|null|undefined,max=12){return rows?.length?rows.slice(0,max):[]}

async function buildLiveContext(metrics?:any,role:HugoRole='admin',section='dashboard',extraContext?:any){
 const sb=supabase as any;
 const results=await Promise.all([
  sb.from('vista_admin_dashboard').select('*').maybeSingle(),
  sb.from('usuarios').select('id,nombre,apellido,tipo,activo,online,zona,pais,karma,servicios_completados,fecha_registro').order('fecha_registro',{ascending:false}).limit(60),
  sb.from('vista_todos_proveedores').select('id,nombre,apellido,categoria,zona,pais,activo,online,estado_mapa,servicios_completados').limit(60),
  sb.from('servicios').select('id,numero,estado,zona,tarifa,created_at,descripcion,cliente_id,proveedor_id,categoria_id').order('created_at',{ascending:false}).limit(80),
  sb.from('disputas').select('id,numero,estado,monto_disputado,motivo,created_at').order('created_at',{ascending:false}).limit(40),
  sb.from('pagos').select('id,servicio_id,estado,monto_bruto,comision_ugo,ganancia_proveedor,metodo,created_at').order('created_at',{ascending:false}).limit(60),
  sb.from('retiros').select('id,proveedor_id,monto,estado,created_at').order('created_at',{ascending:false}).limit(40),
  sb.from('deudas_ugo_proveedor').select('id,pago_id,servicio_id,proveedor_id,monto_servicio,comision_ugo,monto_pagado_ugo,saldo_pendiente,estado,created_at').order('created_at',{ascending:false}).limit(40),
  sb.from('documentos').select('id,tipo,estado,created_at,usuario_id,ocr_valido,ocr_confianza').order('created_at',{ascending:false}).limit(40),
  sb.from('categorias').select('id,nombre,slug,emoji,activa').order('nombre').limit(80),
  sb.from('tarifas').select('id,zona,precio_base,precio_hora,precio_min,precio_max,activa,categoria_id').limit(80),
  sb.from('notificaciones').select('id,titulo,tipo,created_at').order('created_at',{ascending:false}).limit(40),
  sb.from('mapa_operativo_usuarios').select('id,nombre,apellido,tipo,categoria,karma,activo,online,lat,lng,zona').not('lat','is',null).limit(120),
  sb.from('mapa_operativo_servicios').select('id,estado,descripcion,tarifa,created_at,lat_cliente,lng_cliente,proveedor_lat,proveedor_lng').limit(80),
  sb.from('servicio_estado_eventos').select('id,servicio_id,actor_role,estado_anterior,estado_nuevo,motivo,created_at').order('created_at',{ascending:false}).limit(60),
  sb.from('resenas').select('id,servicio_id,proveedor_id,puntuacion,comentario,autor_tipo,created_at').order('created_at',{ascending:false}).limit(40),
  sb.from('mensajes').select('id,servicio_id,emisor_rol,contenido,leido_at,created_at').order('created_at',{ascending:false}).limit(40),
  sb.from('config_sistema').select('clave,grupo,descripcion,updated_at').order('grupo').limit(80),
  sb.from('development_checklist').select('code,area,title,description,priority,status,evidence,test_required,updated_at').order('position',{ascending:true}).limit(80),
  sb.from('development_incidents').select('severity,event_type,status,action,checklist_code,message,occurrences,last_seen_at,runtime_revision').neq('status','resolved').order('last_seen_at',{ascending:false}).limit(60)
 ]);
 const names=['dashboard','usuarios','proveedores','servicios','disputas','pagos','retiros','deuda_ugo','documentos','categorias','tarifas','notificaciones','mapa_usuarios','mapa_servicios','eventos_estado','resenas','mensajes','configuracion','readiness','incidentes'];
 const unavailable=results.map((result:any,index)=>result?.error?names[index]:null).filter(Boolean);
 const[dashboard,users,providers,services,disputes,payments,withdrawals,cashDebts,docs,categories,tariffs,notifications,mapUsers,mapServices,stateEvents,reviews,messages,config,checklist,incidents]=results;
 const u=users.data||[],p=providers.data||[],s=services.data||[],d=disputes.data||[],pay=payments.data||[],w=withdrawals.data||[],debts=cashDebts.data||[],x=docs.data||[],cats=categories.data||[],rates=tariffs.data||[],notes=notifications.data||[],mapU=mapUsers.data||[],mapS=mapServices.data||[],events=stateEvents.data||[],ratings=reviews.data||[],msgs=messages.data||[],cfg=config.data||[],ready=checklist.data||[],incs=incidents.data||[];
 const sum=(rows:any[],field:string)=>rows.reduce((total,row)=>total+Number(row?.[field]||0),0);
 const byState=(rows:any[])=>rows.reduce((all:any,row:any)=>{const key=String(row?.estado||row?.estado_nuevo||'sin_estado');all[key]=(all[key]||0)+1;return all},{});
 const privileged=role==='superadmin'?{feature_flags:extraContext?.flags||{},integraciones:Array.isArray(extraContext?.integrations)?extraContext.integrations.slice(0,20):[],auditoria:Array.isArray(extraContext?.audit)?extraContext.audit.slice(0,12):[]}:undefined;
 return JSON.stringify({
  hugo:{nombre:'Hugo',rol:role==='superadmin'?'Hugo Super Admin':'Hugo Admin',superficie:section,modo:'lectura integral + acciones UI permitidas; cambios sensibles sólo mediante controles auditados del panel'},
  dashboard:dashboard.data||metrics||null,
  superadmin:privileged,
  usuarios:{muestra:u.length,activos:u.filter((v:any)=>v.activo).length,clientes:u.filter((v:any)=>v.tipo==='cliente').length,proveedores:u.filter((v:any)=>v.tipo==='proveedor').length,admins:u.filter((v:any)=>['admin','superadmin'].includes(String(v.tipo))).length,recientes:compactRows(u,12)},
  proveedores:{muestra:p.length,online:p.filter((v:any)=>v.online).length,activos:p.filter((v:any)=>v.activo).length,recientes:compactRows(p,12)},
  servicios:{muestra:s.length,por_estado:byState(s),recientes:compactRows(s,18)},
  disputas:{abiertas:d.filter((v:any)=>['abierta','en_revision'].includes(v.estado)).length,por_estado:byState(d),recientes:compactRows(d,10)},
  pagos:{muestra:pay.length,por_estado:byState(pay),monto_bruto_muestra:sum(pay,'monto_bruto'),comision_ugo_muestra:sum(pay,'comision_ugo'),recientes:compactRows(pay,12)},
  retiros:{muestra:w.length,por_estado:byState(w),monto_muestra:sum(w,'monto'),recientes:compactRows(w,10)},
  deuda_ugo_efectivo:{muestra:debts.length,por_estado:byState(debts),saldo_pendiente_muestra:sum(debts,'saldo_pendiente'),recientes:compactRows(debts,10)},
  documentos:{pendientes:x.filter((v:any)=>['pendiente','procesando'].includes(v.estado)).length,por_estado:byState(x),recientes:compactRows(x,10)},
  categorias:{total:cats.length,activas:cats.filter((v:any)=>v.activa!==false).length,nombres:cats.slice(0,60).map((v:any)=>({id:v.id,slug:v.slug,nombre:v.nombre,emoji:v.emoji,activa:v.activa}))},
  tarifas:{muestra:rates.length,activas:rates.filter((v:any)=>v.activa!==false).length,recientes:compactRows(rates,14)},
  notificaciones:{muestra:notes.length,recientes:compactRows(notes,10)},
  mapa_operativo:{personas:mapU.length,proveedores_online:mapU.filter((v:any)=>v.tipo==='proveedor'&&v.online&&v.activo).length,proveedores_offline:mapU.filter((v:any)=>v.tipo==='proveedor'&&!v.online&&v.activo).length,clientes:mapU.filter((v:any)=>v.tipo==='cliente').length,personas_muestra:compactRows(mapU,24),servicios_muestra:compactRows(mapS,18)},
  timeline_estados:{muestra:events.length,recientes:compactRows(events,18)},
  calificaciones:{muestra:ratings.length,promedio:ratings.length?ratings.reduce((n:number,v:any)=>n+Number(v.puntuacion||0),0)/ratings.length:null,recientes:compactRows(ratings,10)},
  mensajes:{muestra:msgs.length,no_leidos:msgs.filter((v:any)=>!v.leido_at).length,recientes:compactRows(msgs.map((v:any)=>({...v,contenido:String(v.contenido||'').slice(0,180)})),12)},
  configuracion:{claves:compactRows(cfg,30)},
  readiness:{bloqueados:ready.filter((v:any)=>v.status==='blocked').length,pendientes:ready.filter((v:any)=>!['approved','validated'].includes(String(v.status))).length,p0_abiertos:ready.filter((v:any)=>v.priority==='P0'&&!['approved','validated'].includes(String(v.status))).length,p1_abiertos:ready.filter((v:any)=>v.priority==='P1'&&!['approved','validated'].includes(String(v.status))).length,items:compactRows(ready,40)},
  incidentes:{p0_abiertos:incs.filter((v:any)=>v.severity==='P0').length,p1_abiertos:incs.filter((v:any)=>v.severity==='P1').length,recientes:compactRows(incs,24)},
  fuentes_no_disponibles:unavailable,
  generado_en:new Date().toISOString()
 });
}
const CATEGORY_ALIASES:[RegExp,string][]=[[/electricista|eletricista/i,'electricista'],[/plomero|encanador|hidraul/i,'plomero'],[/gasista/i,'gasista'],[/limpieza|limpeza|faxina/i,'limpeza'],[/chaveiro|cerrajero|locksmith/i,'chaveiro'],[/pintor|pintura/i,'pintura'],[/carpinter|marcen/i,'carpintaria'],[/jardin|paisag/i,'jardinagem'],[/climat|aire acondicionado|hvac/i,'climatizacao'],[/informatic|comput|redes|\bti\b/i,'ti_redes'],[/reforma|construc/i,'reformas'],[/marido de aluguel|servicios generales|serviços gerais/i,'marido_aluguel'],[/mudanza|mudança|frete/i,'mudanca'],[/auto|mecanico|mecânico/i,'automotivo']];
function parseScoutIntent(text:string){
 const lower=text.toLowerCase();
 const category=CATEGORY_ALIASES.find(([rx])=>rx.test(lower))?.[1];
 const scoutWord=/scout|busca(me|r)?|encontra(r)?|prospect|proveedores|profesionales/i.test(lower);
 if(!category||!scoutWord)return null;
 const placeMatch=text.match(/\ben\s+(.+?)(?:\s+(?:con|a|dentro|hasta|que)\b|$)/i);
 const place=(placeMatch?.[1]||'Florianópolis, SC').trim();
 const limitMatch=text.match(/\b(\d{1,2})\b/);const limit=Math.min(Math.max(Number(limitMatch?.[1]||10),1),20);
 const radiusMatch=text.match(/(\d+(?:[.,]\d+)?)\s*km/i);const radius=radiusMatch?Math.min(Number(radiusMatch[1].replace(',','.'))*1000,50000):5000;
 const withPhone=/con (?:tel[eé]fono|whatsapp)|que tengan? (?:tel[eé]fono|whatsapp)/i.test(text);
 return{category,place,limit,radius,withPhone};
}
async function geocodePlace(place:string){
 const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`);if(!r.ok)throw new Error('No pude ubicar la zona.');const d=await r.json();if(!d?.[0])throw new Error(`No encontré la ubicación “${place}”.`);return{lat:Number(d[0].lat),lng:Number(d[0].lon),label:d[0].display_name||place};
}
function scoreCandidate(p:any,radius:number){
 let score=0;if(p.phone)score+=42;if(p.website)score+=18;if(p.address)score+=10;const dist=Number(p.dist||radius);score+=Math.max(0,30-Math.round((dist/Math.max(radius,1))*30));return Math.max(0,Math.min(100,score));
}
async function runScout(text:string){
 const intent=parseScoutIntent(text);if(!intent)return null;const loc=await geocodePlace(intent.place);
 const r=await fetch('/api/scout/places',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:loc.lat,lng:loc.lng,radius:Math.round(intent.radius),categoria:intent.category})});
 const data=await r.json();if(!r.ok)throw new Error(data?.error||'Scout no pudo buscar proveedores.');
 let rows:ScoutCandidate[]=(data.results||[]).map((p:any)=>({id:p.id,name:p.name,phone:p.phone||undefined,address:p.address||undefined,lat:Number(p.lat),lng:Number(p.lng),dist:Number(p.dist||0),website:p.website||undefined,source:p.source,score:scoreCandidate(p,intent.radius)}));
 if(intent.withPhone)rows=rows.filter(p=>Boolean(p.phone));rows.sort((a,b)=>b.score-a.score||a.dist-b.dist);rows=rows.slice(0,intent.limit);
 if(!rows.length)return`Scout no encontró candidatos para ${intent.category} en ${intent.place}${intent.withPhone?' con teléfono':''}.`;
 const lines=rows.map((p,i)=>`${i+1}. ${p.name} — Score ${p.score}/100 — ${(p.dist/1000).toFixed(1)} km${p.phone?` — 📱 ${p.phone}`:''}${p.website?' — 🌐 web':''}`);
 return[`Scout encontró ${rows.length} candidatos en ${intent.place}.`,`Ranking UGO: teléfono 42 pts · web 18 · dirección 10 · cercanía hasta 30.`,...lines].join('\n');
}

function base64Bytes(value:string){const raw=atob(value),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes}
function pcmWav(base64:string,sampleRate:number){const pcm=base64Bytes(base64),buffer=new ArrayBuffer(44+pcm.length),view=new DataView(buffer),write=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i))};write(0,'RIFF');view.setUint32(4,36+pcm.length,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,pcm.length,true);new Uint8Array(buffer,44).set(pcm);return new Blob([buffer],{type:'audio/wav'})}
function ttsBlob(data:GeminiTts){const base64=String(data.audio_base64||''),mime=String(data.mime_type||'audio/wav');if(!base64)throw new Error('Gemini no devolvió audio');if(/audio\/(?:L16|pcm)/i.test(mime))return pcmWav(base64,Number(data.sample_rate||24000));return new Blob([base64Bytes(base64)],{type:mime.split(';')[0]||'audio/wav'})}
function validUiAction(value:any):HugoUiAction|null{if(!value||typeof value!=='object')return null;const type=String(value.type||'');if(!['navigate','open_service','refresh','map_filter'].includes(type))return null;return value as HugoUiAction}

export function ConversationalOrb({metrics,role='admin',section='dashboard',extraContext}:{metrics?:any;role?:HugoRole;section?:string;extraContext?:any}){
 const roleLabel=role==='superadmin'?'Super Admin':'Admin';
 const[open,setOpen]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[msgs,setMsgs]=useState<Msg[]>(()=>[{role:'hugo',text:`Hola. Soy Hugo ${roleLabel}. Puedo leer la operación autorizada de todo el panel, analizarla y también abrir módulos, servicios y filtros del mapa por voz.`}]),[input,setInput]=useState(''),[loading,setLoading]=useState(false),[voiceAvailable,setVoiceAvailable]=useState(false);
 const recognitionRef=useRef<any>(null),endRef=useRef<HTMLDivElement>(null),msgsRef=useRef<Msg[]>(msgs),audioRef=useRef<HTMLAudioElement|null>(null),audioUrlRef=useRef(''),voiceSessionRef=useRef(false),openRef=useRef(false);
 useEffect(()=>{openRef.current=open},[open]);
 useEffect(()=>{msgsRef.current=msgs;endRef.current?.scrollIntoView({behavior:'smooth'})},[msgs,loading]);
 const stopAudio=useCallback(()=>{try{audioRef.current?.pause()}catch{}audioRef.current=null;if(audioUrlRef.current){URL.revokeObjectURL(audioUrlRef.current);audioUrlRef.current=''}window.speechSynthesis?.cancel()},[]);
 const resumeVoice=useCallback(()=>{if(!voiceSessionRef.current||!openRef.current)return;const bridge=window.UGOVoiceBridge;if(bridge?.isAvailable?.()){setOrbState('listening');Promise.resolve(bridge.resumeListening?.()??bridge.startListening()).catch(()=>{voiceSessionRef.current=false;setOrbState('idle')})}},[]);
 const speak=useCallback(async(text:string)=>{stopAudio();window.UGOVoiceBridge?.pauseListening?.();setOrbState('speaking');const finish=()=>{setOrbState('idle');window.setTimeout(resumeVoice,120)};try{const response=await fetch('/api/hugo/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tts:true,text:text.slice(0,360),locale:'es-AR'})}),data=await response.json().catch(()=>({})) as GeminiTts;if(!response.ok||!data.audio_base64)throw new Error(data.error||data.hugo_mensaje||'Gemini TTS no disponible');const blob=ttsBlob(data),url=URL.createObjectURL(blob),audio=new Audio(url);audioRef.current=audio;audioUrlRef.current=url;audio.onended=()=>{if(audioUrlRef.current){URL.revokeObjectURL(audioUrlRef.current);audioUrlRef.current=''}audioRef.current=null;finish()};audio.onerror=()=>finish();await audio.play()}catch{if(!window.speechSynthesis){finish();return}const u=new SpeechSynthesisUtterance(text.replace(/[*_#`]/g,' '));u.lang='es-AR';u.rate=1.02;u.onend=finish;u.onerror=finish;window.speechSynthesis.speak(u)}},[resumeVoice,stopAudio]);
 const dispatchAction=useCallback((action:any)=>{const safe=validUiAction(action);if(!safe)return;window.dispatchEvent(new CustomEvent('ugo:admin:hugo-action',{detail:safe}))},[]);
 const handleSend=useCallback(async(text:string)=>{const clean=text.trim();if(!clean||loading)return;setInput('');setMsgs(p=>[...p,{role:'user',text:clean}]);setLoading(true);setOrbState('thinking');window.UGOVoiceBridge?.pauseListening?.();try{const scout=await runScout(clean);if(scout){setMsgs(p=>[...p,{role:'hugo',text:scout}]);await speak(scout);return}const liveContext=await buildLiveContext(metrics,role,section,extraContext);const history=msgsRef.current.slice(-8).map(m=>({role:m.role==='user'?'user':'assistant',content:m.text}));let reply='',uiAction:HugoUiAction|null=null;try{const response=await fetch('/api/hugo/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:clean,history,context:liveContext,role,surface:section})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error||payload?.hugo_mensaje||`Hugo respondió ${response.status}`);reply=String(payload?.hugo_mensaje||'').trim();uiAction=validUiAction(payload?.ui_action)}catch(apiError){const puter=window.puter;if(!puter?.ai?.chat)throw apiError;const system=[`Sos Hugo ${roleLabel} de U.G.O.`,'Respondé en español rioplatense, claro y ejecutivo.','LIVE_DATA viene del panel autorizado y es la fuente de verdad.','No inventes datos ni afirmes cambios ejecutados.',role==='admin'?'No asumas permisos de Super Admin.':'Podés analizar gobierno global, flags, auditoría e integraciones sólo cuando estén en LIVE_DATA.',`SUPERFICIE: ${section}`,`LIVE_DATA: ${liveContext}`].join('\n');const result=await puter.ai.chat([{role:'system',content:system},...history,{role:'user',content:clean}],{model:'gemini-3.6-flash',temperature:.2,max_tokens:620});reply=extractText(result)}if(!reply)throw new Error('Hugo no devolvió contenido.');setMsgs(p=>[...p,{role:'hugo',text:reply}]);if(uiAction)dispatchAction(uiAction);await speak(reply)}catch(e){const detail=e instanceof Error?e.message:'No se pudo consultar Hugo.';setMsgs(p=>[...p,{role:'hugo',text:`No pude completar la consulta: ${detail}`}]);setOrbState('idle');resumeVoice()}finally{setLoading(false)}},[dispatchAction,extraContext,loading,metrics,resumeVoice,role,roleLabel,section,speak]);
 useEffect(()=>{const bridge=window.UGOVoiceBridge,SR=window.SpeechRecognition||window.webkitSpeechRecognition;setVoiceAvailable(Boolean(bridge?.isAvailable?.()||SR));const onNativeResult=(event:Event)=>{const detail=(event as CustomEvent<{text?:string;final?:boolean}>).detail||{},text=String(detail.text||'').trim();if(detail.final===false){if(text)setOrbState('listening');return}if(text){bridge?.pauseListening?.();void handleSend(text)}};const onNativeState=(event:Event)=>{const detail=(event as CustomEvent<{state?:string}>).detail||{};if(!voiceSessionRef.current)return;if(['connecting','ready','hearing'].includes(String(detail.state||'')))setOrbState('listening')};const onNativeError=()=>{voiceSessionRef.current=false;setOrbState('idle')};window.addEventListener('ugo:native-voice-result',onNativeResult as EventListener);window.addEventListener('ugo:native-voice-state',onNativeState as EventListener);window.addEventListener('ugo:native-voice-error',onNativeError);if(SR){const rec=new SR();rec.lang='es-AR';rec.continuous=false;rec.interimResults=false;rec.onresult=(e:any)=>{const text=String(e?.results?.[0]?.[0]?.transcript||'').trim();if(text)void handleSend(text)};rec.onend=()=>setOrbState(v=>v==='listening'?'idle':v);rec.onerror=()=>setOrbState('idle');recognitionRef.current=rec}return()=>{window.removeEventListener('ugo:native-voice-result',onNativeResult as EventListener);window.removeEventListener('ugo:native-voice-state',onNativeState as EventListener);window.removeEventListener('ugo:native-voice-error',onNativeError);try{recognitionRef.current?.abort?.()}catch{};if(voiceSessionRef.current)bridge?.stopListening?.();stopAudio()}},[handleSend,stopAudio]);
 const toggleMic=()=>{stopAudio();const bridge=window.UGOVoiceBridge;if(bridge?.isAvailable?.()){if(voiceSessionRef.current){voiceSessionRef.current=false;bridge.stopListening();setOrbState('idle');return}voiceSessionRef.current=true;setOrbState('listening');Promise.resolve(bridge.startListening()).catch(()=>{voiceSessionRef.current=false;setOrbState('idle')});return}if(!recognitionRef.current)return;if(orbState==='listening'){try{recognitionRef.current.stop()}catch{}setOrbState('idle')}else{setOrbState('listening');try{recognitionRef.current.start()}catch{setOrbState('idle')}}};
 const closeOrb=()=>{voiceSessionRef.current=false;window.UGOVoiceBridge?.stopListening?.();stopAudio();setOpen(false);setOrbState('idle')};
 const status=orbState==='listening'?'Gemini Live te escucha…':orbState==='thinking'?'Hugo está leyendo U.G.O.…':orbState==='speaking'?'Gemini está hablando…':`${roleLabel.toUpperCase()} · LIVE DATA · GEMINI`;
 return <><style>{CSS}</style><button className="hugo-free-trigger" aria-label={`Abrir Hugo ${roleLabel}`} title={`Hugo ${roleLabel} · Gemini + datos en vivo`} onClick={()=>setOpen(true)}><span><b>Hugo</b><small className="hugo-free-trigger-role">{roleLabel}</small></span></button>{open&&<div className="hugo-free-overlay"><div className="hugo-free-head"><div><strong>U.G.O. · HUGO</strong><small>{roleLabel.toUpperCase()} · GEMINI LIVE · CONTROL CENTER</small></div><button className="hugo-free-close" onClick={closeOrb}>×</button></div><div className="hugo-free-orb-area"><div className="hugo-free-orb-wrap"><div className={`hugo-free-ring ${orbState==='thinking'?'':'hidden'}`}/><div className={`hugo-free-orb ${orbState}`}/></div><div className={`hugo-free-status ${orbState==='thinking'?'thinking':''}`}>{status}</div></div><div className="hugo-free-feed">{msgs.map((m,i)=><div key={i} className={`hugo-msg ${m.role}`}>{m.text}</div>)}{loading&&<div className="hugo-msg hugo">Procesando…</div>}<div ref={endRef}/></div><div className="hugo-free-note">Hugo puede leer los módulos autorizados, abrir pantallas, servicios y filtros del mapa. Cambios sensibles continúan detrás de confirmaciones y permisos del panel.</div><div className="hugo-free-input"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void handleSend(input)}} placeholder={role==='superadmin'?'Ej: mostrame qué necesita atención y abrí el módulo':'Ej: mostrame proveedores online en el mapa'} />{voiceAvailable&&<button className={`hugo-mic ${voiceSessionRef.current?'on':''}`} onClick={toggleMic}>🎙</button>}<button className="hugo-send" disabled={!input.trim()||loading} onClick={()=>void handleSend(input)}>➤</button></div></div>}</>;
}
