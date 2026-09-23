import React,{useCallback,useEffect,useRef,useState}from'react';
import{supabase}from'../lib/supabase';

type OrbState='idle'|'listening'|'thinking'|'speaking';
type HugoRole='admin'|'superadmin';
type Msg={role:'hugo'|'user';text:string};

const CSS=`
@keyframes hugoFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.025)}}
@keyframes hugoThink{to{transform:rotate(360deg)}}
@keyframes hugoPulse{0%,100%{box-shadow:0 4px 22px rgba(5,148,79,.38),0 0 0 0 rgba(5,148,79,.22)}50%{box-shadow:0 4px 30px rgba(5,148,79,.58),0 0 0 10px rgba(5,148,79,0)}}
.hugo-free-trigger{position:fixed;right:28px;bottom:28px;min-width:106px;height:48px;padding:0 15px 0 10px;border:0;border-radius:26px;cursor:pointer;z-index:8000;background:#053f27;color:#fff;display:flex;align-items:center;gap:9px;font:900 13px/1 Inter,system-ui,sans-serif;letter-spacing:.01em;box-shadow:0 6px 24px rgba(5,148,79,.34);animation:hugoPulse 2.8s ease-in-out infinite}
.hugo-free-trigger:before{content:'';width:29px;height:29px;flex:0 0 29px;border-radius:50%;background:radial-gradient(circle at 35% 28%,#10f38b,#05944F 48%,#013c22);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.hugo-free-trigger-role{display:block;margin-top:2px;font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.72)}
.hugo-free-overlay{position:fixed;inset:0;z-index:9500;background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:78px;color:#111;font-family:Inter,system-ui,sans-serif;pointer-events:none}
.hugo-free-head{display:none}
.hugo-free-head strong{font-size:15px;font-weight:900}.hugo-free-head small{display:block;text-align:center;color:#05944F;font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-top:2px;font-weight:800}
.hugo-free-close{position:fixed;right:24px;bottom:28px;width:38px;height:38px;border:0;border-radius:50%;background:#111;color:#fff;cursor:pointer;font-size:18px;pointer-events:auto}
.hugo-free-orb-area{padding:20px 0 12px;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:auto}
.hugo-free-orb-wrap{position:relative;width:142px;height:142px;display:grid;place-items:center}.hugo-free-ring{position:absolute;inset:-12px;border:2px dashed rgba(39,110,241,.3);border-radius:50%;animation:hugoThink 2.3s linear infinite}.hugo-free-ring.hidden{display:none}
.hugo-free-orb{width:96px;height:96px;cursor:pointer;border-radius:50%;background:radial-gradient(circle at 34% 27%,#12f58c,#05944F 46%,#024d2c 72%,#012d1a);box-shadow:0 12px 38px rgba(5,148,79,.22);animation:hugoFloat 3s ease-in-out infinite}.hugo-free-orb.thinking{background:radial-gradient(circle at 34% 27%,#8dc0ff,#276EF1 48%,#173d91 75%,#0b2257)}
.hugo-free-status{height:20px;font-size:12px;color:#777}.hugo-free-status.active{color:#05944F}.hugo-free-status.thinking{color:#276EF1}
.hugo-free-feed{display:none}.hugo-msg{max-width:90%;padding:10px 14px;border-radius:17px;font-size:13px;line-height:1.5;white-space:pre-wrap}.hugo-msg.hugo{align-self:flex-start;background:#fff;border:1px solid rgba(0,0,0,.09);border-bottom-left-radius:5px}.hugo-msg.user{align-self:flex-end;background:#111;color:#fff;border-bottom-right-radius:5px}
.hugo-free-input{display:none}.hugo-free-input input{flex:1;border:1.5px solid rgba(0,0,0,.14);border-radius:24px;padding:11px 15px;font:inherit;outline:none;background:#fff}.hugo-free-input button{width:44px;height:44px;border:0;border-radius:50%;cursor:pointer;font-size:17px}.hugo-mic{background:#edf0f1}.hugo-mic.on{background:#E11900;color:#fff}.hugo-send{background:#111;color:#fff}.hugo-send:disabled{opacity:.35}.hugo-free-note{display:none}.hugo-voice-caption{max-width:min(560px,88vw);margin-top:14px;padding:10px 16px;border-radius:18px;background:rgba(255,255,255,.82);border:1px solid rgba(0,0,0,.07);box-shadow:0 8px 30px rgba(0,0,0,.08);font-size:13px;line-height:1.45;text-align:center;white-space:pre-wrap;pointer-events:none}
@media(max-width:720px){.hugo-free-trigger{right:16px;bottom:78px}.hugo-free-orb{width:112px;height:112px}.hugo-free-orb-wrap{width:124px;height:124px}}
`;

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

export function ConversationalOrb({metrics,role='admin',section='dashboard',extraContext,onVoiceActiveChange}:{metrics?:any;role?:HugoRole;section?:string;extraContext?:any;onVoiceActiveChange?:(active:boolean)=>void}){
 const roleLabel=role==='superadmin'?'Super Admin':'Admin';
 const[open,setOpen]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[msgs,setMsgs]=useState<Msg[]>(()=>[{role:'hugo',text:`Hola. Soy Hugo ${roleLabel}. Puedo leer la operación autorizada de todo el panel, analizarla y también abrir módulos, servicios y filtros del mapa por voz.`}]),[input,setInput]=useState('');
 const endRef=useRef<HTMLDivElement>(null),voiceSessionRef=useRef(false),openRef=useRef(false);
 useEffect(()=>{openRef.current=open;onVoiceActiveChange?.(open)},[open,onVoiceActiveChange]);
 useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[msgs]);
 const stopAudio=useCallback(()=>{try{window.UGOVoiceBridge?.stopSpeaking?.()}catch{}},[])
 useEffect(()=>{const bridge=window.UGOVoiceBridge;const onNativeResult=(event:Event)=>{const detail=(event as CustomEvent<{text?:string;final?:boolean}>).detail||{},text=String(detail.text||'').trim();if(detail.final===false){if(text)setOrbState('listening');return}if(text)setInput(text)};const onNativeState=(event:Event)=>{const detail=(event as CustomEvent<{state?:string}>).detail||{};if(!voiceSessionRef.current)return;if(['connecting','ready','hearing'].includes(String(detail.state||'')))setOrbState('listening')};const onNativeOutput=(event:Event)=>{const text=String((event as CustomEvent<{text?:string}>).detail?.text||'').trim();if(text)setMsgs(p=>[...p,{role:'hugo',text}])};const onNativeTool=async(event:Event)=>{const detail=(event as CustomEvent<{id?:string;name?:string;args?:Record<string,unknown>}>).detail||{},id=String(detail.id||''),name=String(detail.name||''),args=detail.args||{};if(!id||!name||!bridge?.sendToolResponse)return;try{let response:any={ok:false,code:'UNKNOWN_TOOL',message:'Herramienta Admin no disponible'};if(name==='admin_get_operational_summary')response={ok:true,data:JSON.parse(await buildLiveContext(metrics,role,section,extraContext))};else if(name==='admin_find_service'){const key=String(args.service_id||''),{data,error}=await(supabase as any).from('servicios').select('id,numero,estado,zona,tarifa,created_at,descripcion,cliente_id,proveedor_id,categoria_id').or(`id.eq.${key},numero.eq.${Number(key)||-1}`).limit(5);response=error?{ok:false,code:'QUERY_FAILED',message:error.message}:{ok:true,data:{services:data||[]}}}else if(name==='admin_find_user'){const q=String(args.query||'').trim();const{data,error}=await(supabase as any).from('usuarios').select('id,nombre,apellido,email,tipo,activo,online,zona,pais').or(`id.eq.${q},email.ilike.%${q}%,nombre.ilike.%${q}%`).limit(10);response=error?{ok:false,code:'QUERY_FAILED',message:error.message}:{ok:true,data:{users:data||[]}}}bridge.sendToolResponse(id,name,response)}catch(error){bridge.sendToolResponse(id,name,{ok:false,code:'TOOL_FAILED',message:error instanceof Error?error.message:'La consulta falló'})}};const onNativeError=()=>{voiceSessionRef.current=false;setOrbState('idle')};window.addEventListener('ugo:native-voice-result',onNativeResult as EventListener);window.addEventListener('ugo:native-voice-state',onNativeState as EventListener);window.addEventListener('ugo:native-voice-output',onNativeOutput as EventListener);window.addEventListener('ugo:native-voice-tool-call',onNativeTool as EventListener);window.addEventListener('ugo:native-voice-error',onNativeError);return()=>{window.removeEventListener('ugo:native-voice-result',onNativeResult as EventListener);window.removeEventListener('ugo:native-voice-state',onNativeState as EventListener);window.removeEventListener('ugo:native-voice-output',onNativeOutput as EventListener);window.removeEventListener('ugo:native-voice-tool-call',onNativeTool as EventListener);window.removeEventListener('ugo:native-voice-error',onNativeError);if(voiceSessionRef.current)bridge?.stopListening?.();stopAudio()}},[extraContext,metrics,role,section,stopAudio]);
 const startConversation=useCallback(async()=>{stopAudio();voiceSessionRef.current=true;setOrbState('listening');const bridge=window.UGOVoiceBridge;if(bridge?.isAvailable?.()){try{await bridge.startListening();return}catch{}}voiceSessionRef.current=false;setOrbState('idle')},[stopAudio]);
 const openConversation=()=>{setOpen(true);window.setTimeout(()=>void startConversation(),60)};
 const toggleMic=()=>{stopAudio();const bridge=window.UGOVoiceBridge;if(bridge?.isAvailable?.()){if(voiceSessionRef.current){voiceSessionRef.current=false;bridge.stopListening();setOrbState('idle');return}voiceSessionRef.current=true;setOrbState('listening');Promise.resolve(bridge.startListening()).catch(()=>{voiceSessionRef.current=false;setOrbState('idle')});return}voiceSessionRef.current=false;setOrbState('idle')};
 const closeOrb=()=>{voiceSessionRef.current=false;window.UGOVoiceBridge?.stopListening?.();stopAudio();setOpen(false);setOrbState('idle')};
 const status=orbState==='listening'?'Te escucho. Hablame…':orbState==='thinking'?'Hugo está pensando…':orbState==='speaking'?'Hugo te está respondiendo…':voiceSessionRef.current?'Conversación activa':'Tocá el micrófono para conversar';
 return <><style>{CSS}</style><button className="hugo-free-trigger" aria-label={`Abrir Hugo ${roleLabel}`} title={`Hugo ${roleLabel} · Gemini + datos en vivo`} onClick={openConversation}><span><b>Hugo</b><small className="hugo-free-trigger-role">{roleLabel}</small></span></button>{open&&<div className="hugo-free-overlay"><div className="hugo-free-head"><div><strong>U.G.O. · HUGO</strong><small>{roleLabel.toUpperCase()} · GEMINI LIVE · CONTROL CENTER</small></div><button className="hugo-free-close" onClick={closeOrb}>×</button></div><div className="hugo-free-orb-area"><div className="hugo-free-orb-wrap"><div className={`hugo-free-ring ${orbState==='thinking'?'':'hidden'}`}/><button type="button" aria-label="Activar o pausar Hugo" className={`hugo-free-orb ${orbState}`} onClick={toggleMic}/></div><div className={`hugo-free-status ${orbState==='thinking'?'thinking':''}`}>{status}</div></div><div className="hugo-voice-caption">{msgs[msgs.length-1]?.text||input||'Te escucho…'}</div><div ref={endRef}/></div>}</>;
}
