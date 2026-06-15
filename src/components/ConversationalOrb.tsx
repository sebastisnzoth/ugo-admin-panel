import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';
type Msg = { role: 'hugo' | 'user'; text: string };

const CSS = `
@keyframes orb-idle{0%,100%{transform:translateY(0) scale(1);box-shadow:0 0 24px rgba(5,148,79,.3),0 8px 32px rgba(5,148,79,.15),0 2px 8px rgba(0,0,0,.12)}50%{transform:translateY(-7px) scale(1.02);box-shadow:0 0 44px rgba(5,148,79,.5),0 12px 40px rgba(5,148,79,.25),0 2px 8px rgba(0,0,0,.12)}}
@keyframes orb-listen{0%,100%{transform:scale(1);box-shadow:0 0 30px rgba(5,148,79,.5),0 0 60px rgba(5,148,79,.2)}50%{transform:scale(1.06);box-shadow:0 0 50px rgba(5,148,79,.75),0 0 90px rgba(5,148,79,.35)}}
@keyframes orb-think-bob{0%,100%{transform:translateY(-4px) scale(1)}50%{transform:translateY(4px) scale(.97)}}
@keyframes orb-speak{0%{transform:scale(1)}25%{transform:scale(1.05)}75%{transform:scale(.96)}100%{transform:scale(1)}}
@keyframes ring-out{0%{transform:scale(1);opacity:.45}100%{transform:scale(1.8);opacity:0}}
@keyframes think-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes bar{0%,100%{transform:scaleY(1);opacity:.6}50%{transform:scaleY(2.2);opacity:1}}
@keyframes trig-pulse{0%,100%{box-shadow:0 4px 20px rgba(5,148,79,.4),0 0 0 0 rgba(5,148,79,.25)}50%{box-shadow:0 4px 28px rgba(5,148,79,.6),0 0 0 10px rgba(5,148,79,.0)}}
@keyframes ov-in{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
@keyframes msg-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes mic-p{0%,100%{box-shadow:0 0 0 0 rgba(225,25,0,.35)}50%{box-shadow:0 0 0 10px rgba(225,25,0,.0)}}

.otrig{position:fixed;bottom:28px;right:28px;width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 38% 30%,#08e876,#05944F 50%,#013d22);border:none;cursor:pointer;z-index:8000;animation:trig-pulse 3s ease-in-out infinite;display:flex;align-items:center;justify-content:center;transition:transform .15s;}
.otrig:active{transform:scale(.9);}
.otrig-inner{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.18);position:relative;}
.otrig-inner::before{content:'';position:absolute;top:3px;left:4px;width:7px;height:5px;border-radius:50%;background:rgba(255,255,255,.5);}
@media(max-width:720px){.otrig{bottom:76px;right:16px;width:50px;height:50px;}}

.oov{position:fixed;inset:0;background:rgba(247,247,247,.97);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);z-index:9500;display:flex;flex-direction:column;align-items:center;animation:ov-in .32s cubic-bezier(.32,.72,0,1);}
.ohd{width:100%;display:flex;align-items:center;justify-content:center;padding:18px 16px 0;position:relative;flex-shrink:0;}
.ohd-logo{font-family:'Inter',sans-serif;font-weight:900;font-size:15px;letter-spacing:-.5px;color:#000;}
.ohd-sub{font-family:'Inter',sans-serif;font-size:9px;color:rgba(0,0,0,.4);text-transform:uppercase;letter-spacing:1.2px;margin-top:1px;text-align:center;}
.ocl{position:absolute;right:16px;top:16px;width:34px;height:34px;border-radius:50%;border:none;background:rgba(0,0,0,.07);color:#000;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.ocl:hover{background:rgba(0,0,0,.12);}

.oorb-area{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 0 16px;flex-shrink:0;position:relative;}
.oorb-wrap{position:relative;display:flex;align-items:center;justify-content:center;}
.oorb{width:170px;height:170px;border-radius:50%;position:relative;z-index:2;}
.oorb::before{content:'';position:absolute;top:11%;left:17%;width:31%;height:21%;border-radius:50%;background:radial-gradient(ellipse,rgba(255,255,255,.55) 0%,transparent 70%);transform:rotate(-22deg);z-index:3;}
.oorb::after{content:'';position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 65% 72%,rgba(0,0,0,.28) 0%,transparent 60%);z-index:3;}
.oorb-idle{background:radial-gradient(circle at 35% 28%,#08e876,#05944F 45%,#025C32 72%,#012e1a);animation:orb-idle 3s ease-in-out infinite;}
.oorb-listening{background:radial-gradient(circle at 35% 28%,#0affa0,#05944F 40%,#025C32 70%,#012e1a);animation:orb-listen 1.1s ease-in-out infinite;}
.oorb-thinking{background:radial-gradient(circle at 35% 28%,#80b4ff,#276EF1 45%,#1a4db3 72%,#0c2863);animation:orb-think-bob 2s ease-in-out infinite;}
.oorb-speaking{background:radial-gradient(circle at 35% 28%,#0eff90,#05944F 40%,#025C32 70%,#012e1a);animation:orb-speak .7s ease-in-out infinite;}

.oring{position:absolute;width:210px;height:210px;border-radius:50%;border:1.5px solid rgba(5,148,79,.3);animation:ring-out 2.2s ease-out infinite;pointer-events:none;}
.oring:nth-child(2){animation-delay:.7s;}
.oring:nth-child(3){animation-delay:1.4s;}
.othink-ring{position:absolute;width:205px;height:205px;border-radius:50%;border:2px dashed rgba(39,110,241,.35);animation:think-spin 2s linear infinite;pointer-events:none;}
.obars{display:flex;align-items:flex-end;gap:3px;height:30px;}
.obar{width:3.5px;border-radius:2px;background:#05944F;}
.obar:nth-child(1){height:8px;animation:bar .5s ease-in-out infinite;}
.obar:nth-child(2){height:18px;animation:bar .5s ease-in-out .08s infinite;}
.obar:nth-child(3){height:26px;animation:bar .5s ease-in-out .16s infinite;}
.obar:nth-child(4){height:18px;animation:bar .5s ease-in-out .24s infinite;}
.obar:nth-child(5){height:8px;animation:bar .5s ease-in-out .32s infinite;}
.obar:nth-child(6){height:14px;animation:bar .5s ease-in-out .4s infinite;}
.obar:nth-child(7){height:22px;animation:bar .5s ease-in-out .48s infinite;}

.ost{font-family:'Inter',sans-serif;font-size:13px;font-weight:500;color:rgba(0,0,0,.4);text-align:center;height:22px;margin-top:8px;transition:all .3s;}
.ost-listen{color:#05944F;}
.ost-think{color:#276EF1;}
.ost-speak{color:#05944F;}

.otranscript{width:100%;max-width:460px;flex:1;overflow-y:auto;padding:8px 18px 10px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.08) transparent;}
.omsg{max-width:85%;font-family:'Inter',sans-serif;font-size:13px;line-height:1.55;animation:msg-in .22s ease-out;}
.omsg-hugo{align-self:flex-start;background:#FFF;border:1px solid rgba(0,0,0,.09);border-radius:18px 18px 18px 4px;padding:10px 14px;box-shadow:0 1px 4px rgba(0,0,0,.06);color:#000;}
.omsg-user{align-self:flex-end;background:#000;color:#FFF;border-radius:18px 18px 4px 18px;padding:10px 14px;}
.odots{display:flex;gap:4px;padding:12px 14px;align-items:center;}
.odot{width:6px;height:6px;border-radius:50%;background:#C8C8C8;animation:bar .9s ease-in-out infinite;}
.odot:nth-child(2){animation-delay:.18s;}
.odot:nth-child(3){animation-delay:.36s;}

.oinput-row{width:100%;max-width:460px;display:flex;align-items:center;gap:8px;padding:10px 18px 28px;border-top:1px solid rgba(0,0,0,.06);flex-shrink:0;}
.oinput{flex:1;background:#FFF;border:1.5px solid rgba(0,0,0,.12);border-radius:24px;padding:10px 16px;font-family:'Inter',sans-serif;font-size:13px;outline:none;transition:border-color .2s;caret-color:#05944F;color:#000;}
.oinput:focus{border-color:#05944F;}
.omic{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;transition:all .15s;}
.omic-idle{background:#F0F0F0;}
.omic-active{background:#E11900;animation:mic-p .8s ease-in-out infinite;}
.osend{width:44px;height:44px;border-radius:50%;border:none;background:#000;color:#FFF;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;}
.osend:active{opacity:.75;}
.osend:disabled{opacity:.3;cursor:not-allowed;}
@media(max-width:500px){.oorb{width:130px;height:130px;}.oring{width:170px;height:170px;}.othink-ring{width:165px;height:165px;}}
`;

export function ConversationalOrb({ metrics }: { metrics?: any }) {
  const [open, setOpen] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [msgs, setMsgs] = useState<Msg[]>([
    { role:'hugo', text:'Hola. Soy Hugo, el núcleo de inteligencia de U.GO. ¿En qué te puedo ayudar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setHasVoice(true);
      const rec = new SR();
      rec.lang = 'es-ES';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e: any) => {
        const t = e.results[0][0].transcript;
        handleSend(t);
      };
      rec.onend = () => {
        if (orbState === 'listening') setOrbState('thinking');
      };
      rec.onerror = () => setOrbState('idle');
      recognitionRef.current = rec;
    }
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 300); }, [open]);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[^\w\s.,!?¿¡áéíóúñü]/gi, ' ').trim();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'es-ES';
    u.rate = 1.05;
    u.pitch = 1;
    u.onstart = () => setOrbState('speaking');
    u.onend = () => setOrbState('idle');
    u.onerror = () => setOrbState('idle');
    synthRef.current = u;
    window.speechSynthesis.speak(u);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setMsgs(p => [...p, { role:'user', text }]);
    setLoading(true);
    setOrbState('thinking');

    const ctx = metrics
      ? `Servicios activos:${metrics.servicios_activos} Bóveda:R$${metrics.boveda_total} Proveedores:${metrics.proveedores_online}/${metrics.proveedores_total} Ingresos hoy:R$${metrics.ingresos_hoy}`
      : '';

    try {
      const { data, error } = await (supabase as any).functions.invoke('hugo-chat', {
        body: {
          role: 'admin',
          message: text,
          context: ctx,
          history: msgs.slice(-6).map((m: any) => ({ role: m.role==='user'?'user':'assistant', content: m.text })),
        },
      });
      if (error) throw error;
      const reply = (data?.hugo_mensaje || 'Error al procesar.').trim();
      setMsgs(p => [...p, { role:'hugo', text: reply }]);
      speak(reply);
    } catch {
      const err = 'Sin conexión con Hugo. Verificá que ANTHROPIC_API_KEY esté configurado en Supabase → Edge Functions → Secrets.';
      setMsgs(p => [...p, { role:'hugo', text: err }]);
      setOrbState('idle');
    } finally {
      setLoading(false);
    }
  }, [loading, msgs, metrics, speak]);

  const toggleMic = useCallback(() => {
    if (!recognitionRef.current) return;
    if (orbState === 'listening') {
      recognitionRef.current.stop();
      setOrbState('idle');
    } else {
      window.speechSynthesis?.cancel();
      setOrbState('listening');
      recognitionRef.current.start();
    }
  }, [orbState]);

  const handleClose = () => {
    window.speechSynthesis?.cancel();
    if (orbState === 'listening') recognitionRef.current?.stop();
    setOrbState('idle');
    setOpen(false);
  };

  const statusText = {
    idle: 'Toca el micrófono o escribe...',
    listening: 'Escuchando...',
    thinking: 'Pensando...',
    speaking: 'Hablando...',
  }[orbState];

  return (
    <>
      <style>{CSS}</style>

      {/* Floating trigger */}
      {!open && (
        <button className="otrig" onClick={() => setOpen(true)} title="Hablar con Hugo">
          <div className="otrig-inner" />
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div className="oov">
          {/* Header */}
          <div className="ohd">
            <div>
              <div className="ohd-logo">Hugo</div>
              <div className="ohd-sub">Núcleo de Inteligencia U.GO</div>
            </div>
            <button className="ocl" onClick={handleClose}>✕</button>
          </div>

          {/* Orb area */}
          <div className="oorb-area">
            <div className="oorb-wrap">
              {/* Rings (listening) */}
              {orbState === 'listening' && <><div className="oring"/><div className="oring"/><div className="oring"/></>}
              {/* Think ring */}
              {orbState === 'thinking' && <div className="othink-ring"/>}
              {/* Sphere */}
              <div className={`oorb oorb-${orbState}`}/>
            </div>
            {/* Speaking bars below orb */}
            {orbState === 'speaking' && (
              <div className="obars" style={{marginTop:'14px'}}>
                {[...Array(7)].map((_,i) => <div key={i} className="obar"/>)}
              </div>
            )}
          </div>

          {/* Status */}
          <div className={`ost ost-${orbState}`}>{statusText}</div>

          {/* Transcript */}
          <div className="otranscript">
            {msgs.map((m, i) => (
              <div key={i} className={`omsg omsg-${m.role}`}>{m.text}</div>
            ))}
            {loading && (
              <div className="omsg omsg-hugo">
                <div className="odots">
                  <div className="odot"/><div className="odot"/><div className="odot"/>
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* Input row */}
          <div className="oinput-row">
            {hasVoice && (
              <button
                className={`omic ${orbState==='listening'?'omic-active':'omic-idle'}`}
                onClick={toggleMic}
                title={orbState==='listening'?'Detener':'Hablar'}
              >
                {orbState === 'listening' ? '⏹' : '🎤'}
              </button>
            )}
            <input
              ref={inputRef}
              className="oinput"
              placeholder="Escribe un mensaje..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
            />
            <button
              className="osend"
              onClick={() => handleSend(input)}
              disabled={!input.trim() || loading}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ConversationalOrb;
