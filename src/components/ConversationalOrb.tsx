import React,{useCallback,useEffect,useRef,useState}from'react';
import{supabase}from'../lib/supabase';

type OrbState='idle'|'listening'|'thinking'|'speaking';
type Msg={role:'hugo'|'user';text:string};
type ScoutCandidate={id:string;name:string;phone?:string;address?:string;lat:number;lng:number;dist:number;website?:string;source?:string;score:number};

const CSS=`
@keyframes hugoFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.025)}}
@keyframes hugoThink{to{transform:rotate(360deg)}}
@keyframes hugoPulse{0%,100%{box-shadow:0 4px 22px rgba(5,148,79,.38),0 0 0 0 rgba(5,148,79,.22)}50%{box-shadow:0 4px 30px rgba(5,148,79,.58),0 0 0 10px rgba(5,148,79,0)}}
.hugo-free-trigger{position:fixed;right:28px;bottom:28px;width:58px;height:58px;border:0;border-radius:50%;cursor:pointer;z-index:8000;background:radial-gradient(circle at 35% 28%,#10f38b,#05944F 48%,#013c22);animation:hugoPulse 2.8s ease-in-out infinite}
.hugo-free-trigger:after{content:'';position:absolute;inset:18px;border-radius:50%;background:rgba(255,255,255,.22)}
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

async function buildLiveContext(metrics?:any){
 const sb=supabase as any;
 const[dashboard,users,providers,services,disputes,escrow,docs]=await Promise.all([
  sb.from('vista_admin_dashboard').select('*').maybeSingle(),
  sb.from('usuarios').select('id,nombre,apellido,email,tipo,activo,online,zona,pais,karma,servicios_completados,fecha_registro').order('fecha_registro',{ascending:false}).limit(40),
  sb.from('vista_todos_proveedores').select('id,nombre,apellido,categoria,zona,pais,activo,online,estado_mapa,servicios_completados').limit(40),
  sb.from('servicios').select('id,estado,zona,tarifa,created_at,descripcion,cliente_id,proveedor_id,categoria_id').order('created_at',{ascending:false}).limit(40),
  sb.from('disputas').select('id,numero,estado,monto_disputado,motivo,created_at').order('created_at',{ascending:false}).limit(20),
  sb.from('escrow').select('*').order('created_at',{ascending:false}).limit(30),
  sb.from('documentos').select('id,tipo,estado,created_at,usuario_id,ocr_valido,ocr_confianza').order('created_at',{ascending:false}).limit(30)
 ]);
 const u=users.data||[],p=providers.data||[],s=services.data||[],d=disputes.data||[],e=escrow.data||[],x=docs.data||[];
 return JSON.stringify({dashboard:dashboard.data||metrics||null,usuarios:{muestra:u.length,activos:u.filter((v:any)=>v.activo).length,clientes:u.filter((v:any)=>v.tipo==='cliente').length,proveedores:u.filter((v:any)=>v.tipo==='proveedor').length,admins:u.filter((v:any)=>['admin','superadmin'].includes(String(v.tipo))).length},proveedores:{muestra:p.length,online:p.filter((v:any)=>v.online).length,activos:p.filter((v:any)=>v.activo).length,recientes:compactRows(p,12)},servicios:{muestra:s.length,por_estado:s.reduce((a:any,v:any)=>{a[v.estado]=(a[v.estado]||0)+1;return a},{}),recientes:compactRows(s,15)},disputas:{abiertas:d.filter((v:any)=>['abierta','en_revision'].includes(v.estado)).length,recientes:compactRows(d,10)},escrow:{muestra:e.length,por_estado:e.reduce((a:any,v:any)=>{const k=v.estado||'sin_estado';a[k]=(a[k]||0)+1;return a},{}),recientes:compactRows(e,10)},documentos:{pendientes:x.filter((v:any)=>['pendiente','procesando'].includes(v.estado)).length,recientes:compactRows(x,10)},generado_en:new Date().toISOString()});
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

export function ConversationalOrb({metrics}:{metrics?:any}){
 const[open,setOpen]=useState(false),[orbState,setOrbState]=useState<OrbState>('idle'),[msgs,setMsgs]=useState<Msg[]>([{role:'hugo',text:'Hola. Soy Hugo Super Admin. También manejo Scout: podés decir “buscame 10 electricistas en Canasvieiras con teléfono”.'}]),[input,setInput]=useState(''),[loading,setLoading]=useState(false),[voiceAvailable,setVoiceAvailable]=useState(false);const recognitionRef=useRef<any>(null),endRef=useRef<HTMLDivElement>(null),msgsRef=useRef<Msg[]>(msgs);
 useEffect(()=>{msgsRef.current=msgs;endRef.current?.scrollIntoView({behavior:'smooth'})},[msgs,loading]);
 const speak=useCallback((text:string)=>{if(!window.speechSynthesis){setOrbState('idle');return}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text.replace(/[*_#`]/g,' '));u.lang='es-AR';u.rate=1.02;u.onstart=()=>setOrbState('speaking');u.onend=()=>setOrbState('idle');u.onerror=()=>setOrbState('idle');window.speechSynthesis.speak(u)},[]);
 const handleSend=useCallback(async(text:string)=>{const clean=text.trim();if(!clean||loading)return;setInput('');setMsgs(p=>[...p,{role:'user',text:clean}]);setLoading(true);setOrbState('thinking');try{const scout=await runScout(clean);if(scout){setMsgs(p=>[...p,{role:'hugo',text:scout}]);speak(scout);return}const liveContext=await buildLiveContext(metrics);const puter=window.puter;if(!puter?.ai?.chat)throw new Error('Puter AI todavía no cargó. Recargá la página.');const system=['Sos Hugo Super Admin de U.G.O.','Respondé en español rioplatense, breve y ejecutivo.','LIVE_DATA viene de Supabase y es la fuente de verdad.','No inventes datos ni afirmes cambios ejecutados.','Esta versión es de lectura; Scout sí puede buscar y rankear prospectos, pero no contactarlos ni aprobarlos automáticamente.',`LIVE_DATA: ${liveContext}`].join('\n');const history=msgsRef.current.slice(-8).map(m=>({role:m.role==='user'?'user':'assistant',content:m.text}));const result=await puter.ai.chat([{role:'system',content:system},...history,{role:'user',content:clean}],{model:'gemini-3.6-flash',temperature:.25,max_tokens:520});const reply=extractText(result);if(!reply)throw new Error('El modelo no devolvió contenido.');setMsgs(p=>[...p,{role:'hugo',text:reply}]);speak(reply)}catch(e){const detail=e instanceof Error?e.message:'No se pudo consultar Hugo.';setMsgs(p=>[...p,{role:'hugo',text:`No pude completar la consulta: ${detail}`}]);setOrbState('idle')}finally{setLoading(false)}},[loading,metrics,speak]);
 useEffect(()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;setVoiceAvailable(true);const rec=new SR();rec.lang='es-AR';rec.continuous=false;rec.interimResults=false;rec.onresult=(e:any)=>{const text=String(e?.results?.[0]?.[0]?.transcript||'').trim();if(text)handleSend(text)};rec.onend=()=>setOrbState(s=>s==='listening'?'idle':s);rec.onerror=()=>setOrbState('idle');recognitionRef.current=rec;return()=>{try{rec.abort()}catch{}}},[handleSend]);
 const toggleMic=()=>{if(!recognitionRef.current)return;if(orbState==='listening'){try{recognitionRef.current.stop()}catch{}setOrbState('idle')}else{window.speechSynthesis?.cancel();setOrbState('listening');try{recognitionRef.current.start()}catch{setOrbState('idle')}}};
 const status=orbState==='listening'?'Te escucho…':orbState==='thinking'?'Consultando U.G.O. / Scout…':orbState==='speaking'?'Hugo está hablando…':'SUPER ADMIN · LIVE DATA · SCOUT';
 return <><style>{CSS}</style><button className="hugo-free-trigger" aria-label="Abrir Hugo Super Admin" title="Hugo Super Admin + Scout" onClick={()=>setOpen(true)}/>{open&&<div className="hugo-free-overlay"><div className="hugo-free-head"><div><strong>U.G.O. · HUGO</strong><small>SUPER ADMIN · LIVE DATA · SCOUT</small></div><button className="hugo-free-close" onClick={()=>{window.speechSynthesis?.cancel();setOpen(false);setOrbState('idle')}}>×</button></div><div className="hugo-free-orb-area"><div className="hugo-free-orb-wrap"><div className={`hugo-free-ring ${orbState==='thinking'?'':'hidden'}`}/><div className={`hugo-free-orb ${orbState}`}/></div><div className={`hugo-free-status ${orbState==='thinking'?'thinking':''}`}>{status}</div></div><div className="hugo-free-feed">{msgs.map((m,i)=><div key={i} className={`hugo-msg ${m.role}`}>{m.text}</div>)}{loading&&<div className="hugo-msg hugo">Procesando…</div>}<div ref={endRef}/></div><div className="hugo-free-note">Scout busca y rankea prospectos. Las altas, contactos y cambios siguen requiriendo acción explícita del administrador.</div><div className="hugo-free-input"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleSend(input)}} placeholder="Ej: buscame 10 electricistas en Canasvieiras con teléfono"/>{voiceAvailable&&<button className={`hugo-mic ${orbState==='listening'?'on':''}`} onClick={toggleMic}>🎙</button>}<button className="hugo-send" disabled={!input.trim()||loading} onClick={()=>handleSend(input)}>➤</button></div></div>}</>;
}
