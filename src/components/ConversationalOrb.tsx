import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';
type Msg = { role: 'hugo' | 'user'; text: string };

const CSS = `
@keyframes hugoFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.025)}}
@keyframes hugoListen{0%,100%{transform:scale(1);box-shadow:0 0 32px rgba(5,148,79,.5),0 0 72px rgba(5,148,79,.18)}50%{transform:scale(1.07);box-shadow:0 0 52px rgba(5,148,79,.75),0 0 100px rgba(5,148,79,.3)}}
@keyframes hugoThink{to{transform:rotate(360deg)}}
@keyframes hugoSpeak{0%,100%{transform:scale(1)}45%{transform:scale(1.06)}}
@keyframes hugoPulse{0%,100%{box-shadow:0 4px 22px rgba(5,148,79,.38),0 0 0 0 rgba(5,148,79,.22)}50%{box-shadow:0 4px 30px rgba(5,148,79,.58),0 0 0 10px rgba(5,148,79,0)}}
.hugo-free-trigger{position:fixed;right:28px;bottom:28px;width:58px;height:58px;border:0;border-radius:50%;cursor:pointer;z-index:8000;background:radial-gradient(circle at 35% 28%,#10f38b,#05944F 48%,#013c22);animation:hugoPulse 2.8s ease-in-out infinite}
.hugo-free-trigger:after{content:'';position:absolute;inset:18px;border-radius:50%;background:rgba(255,255,255,.22)}
.hugo-free-overlay{position:fixed;inset:0;z-index:9500;background:rgba(247,248,249,.98);backdrop-filter:blur(18px);display:flex;flex-direction:column;align-items:center;color:#111;font-family:Inter,system-ui,sans-serif}
.hugo-free-head{width:100%;height:64px;display:flex;align-items:center;justify-content:center;position:relative;border-bottom:1px solid rgba(0,0,0,.06)}
.hugo-free-head strong{font-size:15px;font-weight:900}.hugo-free-head small{display:block;text-align:center;color:#05944F;font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-top:2px;font-weight:800}
.hugo-free-close{position:absolute;right:18px;top:15px;width:34px;height:34px;border:0;border-radius:50%;background:#eceeef;cursor:pointer;font-size:18px}
.hugo-free-orb-area{padding:26px 0 14px;display:flex;flex-direction:column;align-items:center;gap:11px}
.hugo-free-orb-wrap{position:relative;width:178px;height:178px;display:grid;place-items:center}.hugo-free-ring{position:absolute;inset:-14px;border:2px dashed rgba(39,110,241,.3);border-radius:50%;animation:hugoThink 2.3s linear infinite}.hugo-free-ring.hidden{display:none}
.hugo-free-orb{width:160px;height:160px;border-radius:50%;background:radial-gradient(circle at 34% 27%,#12f58c,#05944F 46%,#024d2c 72%,#012d1a);box-shadow:0 12px 38px rgba(5,148,79,.22);animation:hugoFloat 3s ease-in-out infinite}.hugo-free-orb.listening{animation:hugoListen 1s ease-in-out infinite}.hugo-free-orb.thinking{background:radial-gradient(circle at 34% 27%,#8dc0ff,#276EF1 48%,#173d91 75%,#0b2257);animation:hugoFloat 1.7s ease-in-out infinite}.hugo-free-orb.speaking{animation:hugoSpeak .65s ease-in-out infinite}
.hugo-free-status{height:20px;font-size:12px;color:#777}.hugo-free-status.active{color:#05944F}.hugo-free-status.thinking{color:#276EF1}
.hugo-free-feed{width:min(560px,94vw);flex:1;overflow:auto;padding:8px 16px 12px;display:flex;flex-direction:column;gap:8px}.hugo-msg{max-width:88%;padding:10px 14px;border-radius:17px;font-size:13px;line-height:1.5;white-space:pre-wrap}.hugo-msg.hugo{align-self:flex-start;background:#fff;border:1px solid rgba(0,0,0,.09);border-bottom-left-radius:5px}.hugo-msg.user{align-self:flex-end;background:#111;color:#fff;border-bottom-right-radius:5px}
.hugo-free-input{width:min(560px,94vw);padding:12px 16px 26px;display:flex;gap:8px;border-top:1px solid rgba(0,0,0,.06)}.hugo-free-input input{flex:1;border:1.5px solid rgba(0,0,0,.14);border-radius:24px;padding:11px 15px;font:inherit;outline:none;background:#fff}.hugo-free-input input:focus{border-color:#05944F}.hugo-free-input button{width:44px;height:44px;border:0;border-radius:50%;cursor:pointer;font-size:17px}.hugo-mic{background:#edf0f1}.hugo-mic.on{background:#E11900;color:#fff}.hugo-send{background:#111;color:#fff}.hugo-send:disabled{opacity:.35}.hugo-free-note{width:min(560px,94vw);font-size:9px;color:#8a8a8a;text-align:center;padding-bottom:8px}
@media(max-width:720px){.hugo-free-trigger{right:16px;bottom:78px}.hugo-free-orb{width:132px;height:132px}.hugo-free-orb-wrap{width:150px;height:150px}}
`;

function extractText(result: any) {
  const content = result?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map((p: any) => typeof p === 'string' ? p : p?.text || '').join(' ').trim();
  return typeof result === 'string' ? result.trim() : '';
}

function compactRows(rows: any[] | null | undefined, max = 12) {
  if (!rows?.length) return [];
  return rows.slice(0, max);
}

async function buildLiveContext(metrics?: any) {
  const sb = supabase as any;
  const [dashboard, users, providers, services, disputes, escrow, docs] = await Promise.all([
    sb.from('vista_admin_dashboard').select('*').maybeSingle(),
    sb.from('usuarios').select('id,nombre,apellido,email,tipo,activo,online,zona,pais,karma,servicios_completados,fecha_registro').order('fecha_registro',{ascending:false}).limit(40),
    sb.from('vista_todos_proveedores').select('id,nombre,apellido,categoria,zona,pais,activo,online,estado_mapa,servicios_completados').limit(40),
    sb.from('servicios').select('id,estado,zona,tarifa,created_at,descripcion,cliente_id,proveedor_id,categoria_id').order('created_at',{ascending:false}).limit(40),
    sb.from('disputas').select('id,numero,estado,monto_disputado,motivo,created_at').order('created_at',{ascending:false}).limit(20),
    sb.from('escrow').select('*').order('created_at',{ascending:false}).limit(30),
    sb.from('documentos').select('id,tipo,estado,created_at,usuario_id,ocr_valido,ocr_confianza').order('created_at',{ascending:false}).limit(30),
  ]);

  const errors = [dashboard, users, providers, services, disputes, escrow, docs]
    .map((r:any) => r?.error?.message)
    .filter(Boolean);

  const u = users.data || [];
  const p = providers.data || [];
  const s = services.data || [];
  const d = disputes.data || [];
  const e = escrow.data || [];
  const x = docs.data || [];

  const summary = {
    dashboard: dashboard.data || metrics || null,
    usuarios: {
      total_muestra: u.length,
      activos: u.filter((v:any)=>v.activo).length,
      clientes: u.filter((v:any)=>v.tipo==='cliente').length,
      proveedores: u.filter((v:any)=>v.tipo==='proveedor').length,
      admins: u.filter((v:any)=>['admin','superadmin'].includes(String(v.tipo))).length,
    },
    proveedores: {
      total_muestra: p.length,
      online: p.filter((v:any)=>v.online).length,
      activos: p.filter((v:any)=>v.activo).length,
      recientes: compactRows(p, 12),
    },
    servicios: {
      total_muestra: s.length,
      por_estado: s.reduce((a:any,v:any)=>{a[v.estado]=(a[v.estado]||0)+1;return a;},{}),
      recientes: compactRows(s, 15),
    },
    disputas: {
      abiertas: d.filter((v:any)=>['abierta','en_revision'].includes(v.estado)).length,
      recientes: compactRows(d, 10),
    },
    escrow: {
      total_muestra: e.length,
      por_estado: e.reduce((a:any,v:any)=>{const k=v.estado||'sin_estado';a[k]=(a[k]||0)+1;return a;},{}),
      recientes: compactRows(e, 10),
    },
    documentos: {
      pendientes: x.filter((v:any)=>['pendiente','procesando'].includes(v.estado)).length,
      recientes: compactRows(x, 10),
    },
    errores_consulta: errors,
    generado_en: new Date().toISOString(),
  };

  return JSON.stringify(summary);
}

export function ConversationalOrb({ metrics }: { metrics?: any }) {
  const [open, setOpen] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'hugo', text: 'Hola. Soy Hugo Super Admin. Puedo consultar datos reales de U.G.O. en este momento: usuarios, proveedores, servicios, disputas, escrow y documentos. ¿Qué querés revisar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const recognitionRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const msgsRef = useRef<Msg[]>(msgs);

  useEffect(() => { msgsRef.current = msgs; endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) { setOrbState('idle'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ' '));
    u.lang = 'es-AR';
    u.rate = 1.02;
    u.onstart = () => setOrbState('speaking');
    u.onend = () => setOrbState('idle');
    u.onerror = () => setOrbState('idle');
    window.speechSynthesis.speak(u);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setInput('');
    setMsgs(p => [...p, { role: 'user', text: clean }]);
    setLoading(true);
    setOrbState('thinking');

    try {
      const liveContext = await buildLiveContext(metrics);
      const puter = window.puter;
      if (!puter?.ai?.chat) throw new Error('Puter AI todavía no cargó. Recargá la página.');

      const system = [
        'Sos Hugo Super Admin, el núcleo de inteligencia operativa de U.G.O.',
        'Estás hablando con un administrador autorizado de la plataforma.',
        'Respondé en español rioplatense, con voseo, de forma ejecutiva, concreta y útil.',
        'El bloque LIVE_DATA proviene de consultas recién hechas a Supabase y es la fuente principal para datos operativos.',
        'No inventes métricas, estados, precios, pagos, usuarios ni acciones.',
        'Si un dato no está en LIVE_DATA o una consulta falló, decí claramente que no está disponible.',
        'No afirmes que ejecutaste cambios: esta versión es de SOLO LECTURA.',
        'Podés comparar, contar, resumir, detectar anomalías y sugerir acciones, pero no ejecutar modificaciones.',
        `LIVE_DATA: ${liveContext}`,
      ].join('\n');

      const history = msgsRef.current.slice(-8).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const result = await puter.ai.chat([
        { role: 'system', content: system },
        ...history,
        { role: 'user', content: clean },
      ], {
        model: 'gemini-3.6-flash',
        temperature: 0.25,
        max_tokens: 520,
      });

      const reply = extractText(result);
      if (!reply) throw new Error('El modelo gratuito no devolvió contenido.');
      setMsgs(p => [...p, { role: 'hugo', text: reply }]);
      speak(reply);
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'No se pudo consultar Hugo.';
      setMsgs(p => [...p, { role: 'hugo', text: `No pude completar la consulta: ${detail}` }]);
      setOrbState('idle');
    } finally {
      setLoading(false);
    }
  }, [loading, metrics, speak]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setVoiceAvailable(true);
    const rec = new SR();
    rec.lang = 'es-AR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = String(e?.results?.[0]?.[0]?.transcript || '').trim();
      if (text) handleSend(text);
    };
    rec.onend = () => setOrbState(s => s === 'listening' ? 'idle' : s);
    rec.onerror = () => setOrbState('idle');
    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch {} };
  }, [handleSend]);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (orbState === 'listening') {
      try { recognitionRef.current.stop(); } catch {}
      setOrbState('idle');
    } else {
      window.speechSynthesis?.cancel();
      setOrbState('listening');
      try { recognitionRef.current.start(); } catch { setOrbState('idle'); }
    }
  };

  const status = orbState === 'listening' ? 'Te escucho…'
    : orbState === 'thinking' ? 'Consultando U.G.O. y analizando…'
    : orbState === 'speaking' ? 'Hugo está hablando…'
    : 'Datos reales · solo lectura';

  return <>
    <style>{CSS}</style>
    <button className="hugo-free-trigger" aria-label="Abrir Hugo Super Admin" title="Hugo Super Admin" onClick={() => setOpen(true)} />
    {open && <div className="hugo-free-overlay">
      <div className="hugo-free-head">
        <div><strong>U.G.O. · HUGO</strong><small>SUPER ADMIN · LIVE DATA</small></div>
        <button className="hugo-free-close" onClick={() => { window.speechSynthesis?.cancel(); setOpen(false); setOrbState('idle'); }}>×</button>
      </div>

      <div className="hugo-free-orb-area">
        <div className="hugo-free-orb-wrap">
          <div className={`hugo-free-ring ${orbState === 'thinking' ? '' : 'hidden'}`} />
          <div className={`hugo-free-orb ${orbState}`} />
        </div>
        <div className={`hugo-free-status ${orbState === 'listening' || orbState === 'speaking' ? 'active' : ''} ${orbState === 'thinking' ? 'thinking' : ''}`}>{status}</div>
      </div>

      <div className="hugo-free-feed">
        {msgs.map((m, i) => <div key={i} className={`hugo-msg ${m.role}`}>{m.text}</div>)}
        {loading && <div className="hugo-msg hugo">Consultando datos reales…</div>}
        <div ref={endRef} />
      </div>

      <div className="hugo-free-note">Hugo consulta Supabase en tiempo real. Modo seguro: lectura y análisis, sin acciones destructivas.</div>
      <div className="hugo-free-input">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSend(input); }} placeholder="Ej: ¿cuántos proveedores están online?" />
        {voiceAvailable && <button className={`hugo-mic ${orbState === 'listening' ? 'on' : ''}`} onClick={toggleMic} title="Hablar">🎙</button>}
        <button className="hugo-send" disabled={!input.trim() || loading} onClick={() => handleSend(input)} title="Enviar">➤</button>
      </div>
    </div>}
  </>;
}
