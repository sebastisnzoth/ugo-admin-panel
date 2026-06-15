import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  useDashboardMetrics, useConversionKPIs, useSystemAlerts,
  useMapProviders, useActiveServices, useOpenDisputes,
  usePendingDocuments, useActivityFeed, useWeekMetrics,
  useUsuarios, useAuthUsers, useVault, usePendingWithdrawals,
} from '../hooks/useAdminData';
import { supabase } from '../lib/supabase';

type Section = 'dashboard'|'mapa'|'alertas'|'servicios'|'disputas'|'usuarios'|'documentos'|'finanzas';
type UsrTab  = 'perfiles'|'auth';

interface ChatMsg { role:'hugo'|'admin'; text:string; action?:string; ts:Date; }

// ─── CSS ─────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');

.ua*,.ua*::before,.ua*::after{box-sizing:border-box;margin:0;padding:0;}
.ua {
  --bg:#070a0d; --bg2:#0c1118; --bg3:#111820; --card:#0e1520;
  --border:rgba(0,242,255,.09); --bord2:rgba(0,242,255,.22);
  --cyan:#00f2ff; --cdim:rgba(0,242,255,.08);
  --text:#dde6f0; --muted:rgba(221,230,240,.42);
  --green:#00e57a; --amber:#f59e0b; --red:#ef4444; --purple:#a855f7;
  --head:'Syne',sans-serif; --mono:'Space Mono',monospace;
  display:grid;
  grid-template-columns:52px 1fr 320px;
  grid-template-rows:44px 1fr;
  height:100vh; overflow:hidden;
  background:var(--bg); color:var(--text); font-family:var(--mono); font-size:12px;
}

/* TOP BAR */
.ua-tb{grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:0 12px;background:var(--bg2);border-bottom:1px solid var(--border);}
.ua-logo{font-family:var(--head);font-size:14px;font-weight:800;color:var(--cyan);letter-spacing:-.5px;}
.ua-logo-sub{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;}
.ua-chip{display:flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;cursor:pointer;}
.chip-a{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.22);color:var(--amber);}
.chip-r{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);color:var(--red);}
.chip-c{background:rgba(0,229,122,.07);border:1px solid rgba(0,229,122,.2);color:var(--green);}
.ua-tb-r{display:flex;align-items:center;gap:8px;margin-left:auto;}
.live-pill{display:flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;background:rgba(0,229,122,.07);border:1px solid rgba(0,229,122,.2);font-size:10px;color:var(--green);}
.live-dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:blink 2s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.ua-clock{font-size:10px;color:var(--muted);}

/* SIDE NAV */
.ua-nav{display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:2px;background:var(--bg2);border-right:1px solid var(--border);}
.nav-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;width:44px;padding:8px 0;border-radius:6px;cursor:pointer;color:var(--muted);font-size:14px;transition:all .15s;border:none;background:transparent;}
.nav-item:hover{color:var(--text);background:var(--bg3);}
.nav-item.active{color:var(--cyan);background:var(--cdim);}
.nav-label{font-size:8px;text-transform:uppercase;letter-spacing:.5px;}
.nav-badge{position:absolute;top:4px;right:6px;min-width:14px;height:14px;border-radius:7px;background:var(--red);color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:700;padding:0 3px;}

/* MAIN */
.ua-main{overflow:hidden;display:flex;flex-direction:column;position:relative;}
.main-pad{padding:14px;overflow-y:auto;height:100%;scrollbar-width:thin;scrollbar-color:var(--border) transparent;}
.section-title{font-family:var(--head);font-size:16px;font-weight:700;color:var(--cyan);margin-bottom:14px;}

/* METRICS GRID */
.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;}
.metric-card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 14px;position:relative;overflow:hidden;}
.metric-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,currentColor 0,transparent 60%);opacity:.04;}
.mc-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);}
.mc-value{font-size:22px;font-weight:800;font-family:var(--head);margin:4px 0 2px;}
.mc-sub{font-size:10px;color:var(--muted);}

/* KPI GRID */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;}
.kpi-card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 12px;border-left:2px solid currentColor;}
.kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:4px;}
.kpi-value{font-size:18px;font-weight:800;font-family:var(--head);}
.kpi-sub{font-size:9px;color:var(--muted);margin-top:2px;}

/* CHART */
.chart-row{display:grid;grid-template-columns:1fr 240px;gap:10px;margin-bottom:10px;}
.chart-card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px;}
.chart-title{font-size:11px;color:var(--muted);margin-bottom:10px;}
.chart-bars{display:flex;align-items:flex-end;gap:4px;height:80px;}
.chart-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;}
.chart-bar{width:100%;border-radius:3px 3px 0 0;background:var(--cyan);opacity:.7;transition:opacity .2s;cursor:pointer;}
.chart-bar:hover{opacity:1;}
.chart-bar-label{font-size:8px;color:var(--muted);}

/* ALERT WIDGET */
.alert-widget{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px;overflow:hidden;}
.aw-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;}
.aw-item{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);}
.aw-item:last-child{border-bottom:none;}
.aw-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:3px;}
.aw-text{font-size:10px;line-height:1.4;color:var(--text);}
.aw-empty{font-size:11px;color:var(--green);text-align:center;padding:12px 0;}

/* FEED */
.feed-card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px;}
.feed-item{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);}
.feed-item:last-child{border-bottom:none;}
.feed-dot{width:5px;height:5px;border-radius:50%;background:var(--cyan);flex-shrink:0;margin-top:4px;}
.feed-text{font-size:10px;color:var(--text);flex:1;}
.feed-time{font-size:9px;color:var(--muted);flex-shrink:0;}

/* MAP */
.map-wrap{position:relative;height:100%;overflow:hidden;}
.map-stats{position:absolute;top:10px;left:10px;z-index:1000;display:flex;gap:8px;}
.map-stat-pill{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:11px;display:flex;align-items:center;gap:6px;}
.map-legend{position:absolute;bottom:16px;left:10px;z-index:1000;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px 12px;display:flex;gap:14px;font-size:10px;}
.leg-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px;}
.map-sidebar{position:absolute;top:10px;right:10px;z-index:1000;width:220px;max-height:calc(100% - 40px);overflow-y:auto;background:var(--card);border:1px solid var(--border);border-radius:8px;}
.map-sb-head{padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--card);}
.map-prov-item{padding:8px 12px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;}
.map-prov-item:hover{background:var(--bg3);}
.map-prov-item:last-child{border-bottom:none;}
.map-prov-name{font-size:11px;font-weight:600;}
.map-prov-sub{font-size:10px;color:var(--muted);margin-top:1px;}
.map-prov-status{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:4px;}

/* ALERTS SECTION */
.alerts-wrap{padding:14px;overflow-y:auto;height:100%;}
.alert-card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;}
.alert-critical{border-left:3px solid var(--red);}
.alert-warning{border-left:3px solid var(--amber);}
.alert-info{border-left:3px solid var(--purple);}
.alert-icon{font-size:18px;flex-shrink:0;}
.alert-body{flex:1;}
.alert-title{font-size:11px;font-weight:700;margin-bottom:2px;}
.alert-desc{font-size:10px;color:var(--muted);line-height:1.5;}
.alert-actions{display:flex;gap:6px;margin-top:8px;}
.btn-primary{padding:4px 12px;border-radius:4px;font-size:10px;cursor:pointer;border:none;background:var(--cyan);color:#000;font-weight:700;font-family:var(--mono);}
.btn-secondary{padding:4px 10px;border-radius:4px;font-size:10px;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text);font-family:var(--mono);}
.btn-danger{padding:4px 10px;border-radius:4px;font-size:10px;cursor:pointer;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.08);color:var(--red);font-family:var(--mono);}
.alert-empty{text-align:center;padding:40px 0;color:var(--green);font-size:13px;}

/* DATA TABLES */
.table-wrap{background:var(--card);border:1px solid var(--border);border-radius:8px;overflow:hidden;}
.table-head{display:flex;gap:0;padding:8px 12px;background:var(--bg2);border-bottom:1px solid var(--border);font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);}
.table-row{display:flex;gap:0;padding:9px 12px;border-bottom:1px solid var(--border);align-items:center;transition:background .1s;}
.table-row:last-child{border-bottom:none;}
.table-row:hover{background:var(--bg3);}
.tc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;}

/* STATUS PILLS */
.pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;}
.pill-green{background:rgba(0,229,122,.1);color:var(--green);border:1px solid rgba(0,229,122,.2);}
.pill-amber{background:rgba(245,158,11,.1);color:var(--amber);border:1px solid rgba(245,158,11,.2);}
.pill-red{background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.2);}
.pill-cyan{background:rgba(0,242,255,.08);color:var(--cyan);border:1px solid rgba(0,242,255,.2);}
.pill-muted{background:var(--bg3);color:var(--muted);border:1px solid var(--border);}

/* TABS */
.tab-row{display:flex;border-bottom:1px solid var(--border);margin-bottom:12px;}
.tab-btn{padding:7px 14px;cursor:pointer;border:none;background:transparent;color:var(--muted);font-family:var(--mono);font-size:11px;border-bottom:2px solid transparent;transition:all .15s;}
.tab-btn.active{color:var(--cyan);border-bottom-color:var(--cyan);}
.tab-btn:hover{color:var(--text);}

/* MODAL */
.modal-bd{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9000;display:flex;align-items:center;justify-content:center;}
.modal-box{background:var(--card);border:1px solid var(--bord2);border-radius:10px;padding:20px;width:min(680px,92vw);max-height:88vh;overflow-y:auto;}
.modal-title{font-family:var(--head);font-size:15px;color:var(--cyan);margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;}
.modal-close{cursor:pointer;color:var(--muted);background:none;border:none;font-size:18px;font-family:var(--mono);}
.modal-preview{width:100%;border-radius:6px;border:1px solid var(--border);max-height:420px;object-fit:contain;}
.modal-pdf{width:100%;height:420px;border-radius:6px;border:1px solid var(--border);}
.modal-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
.modal-field{background:var(--bg2);border-radius:6px;padding:10px;}
.mf-label{font-size:9px;color:var(--muted);text-transform:uppercase;margin-bottom:4px;}
.mf-value{font-size:12px;}
.modal-actions{display:flex;gap:8px;margin-top:14px;}
.modal-textarea{width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text);font-family:var(--mono);font-size:11px;resize:vertical;min-height:60px;margin:8px 0;}

/* HUGO PANEL */
.ua-hugo{background:var(--bg2);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;}
.hugo-header{padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
.hugo-orb{width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#00f2ff,#006080);box-shadow:0 0 12px rgba(0,242,255,.4);animation:pulse 3s ease-in-out infinite;flex-shrink:0;}
@keyframes pulse{0%,100%{box-shadow:0 0 12px rgba(0,242,255,.4)}50%{box-shadow:0 0 20px rgba(0,242,255,.7)}}
.hugo-name{font-family:var(--head);font-size:13px;color:var(--cyan);}
.hugo-mode{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;}
.hugo-msgs{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin;scrollbar-color:var(--border) transparent;}
.hm{max-width:95%;padding:8px 10px;border-radius:8px;font-size:11px;line-height:1.5;}
.hm-hugo{background:var(--cdim);border:1px solid var(--border);color:var(--text);}
.hm-admin{background:rgba(0,242,255,.08);border:1px solid rgba(0,242,255,.15);color:var(--cyan);align-self:flex-end;}
.hm-time{font-size:9px;color:var(--muted);margin-top:3px;}
.hugo-typing{display:flex;gap:3px;align-items:center;padding:8px 10px;}
.ht-dot{width:5px;height:5px;border-radius:50%;background:var(--muted);}
.ht-dot:nth-child(1){animation:tdot .9s ease-in-out infinite}
.ht-dot:nth-child(2){animation:tdot .9s ease-in-out .2s infinite}
.ht-dot:nth-child(3){animation:tdot .9s ease-in-out .4s infinite}
@keyframes tdot{0%,60%,100%{opacity:.3;transform:scale(1)}30%{opacity:1;transform:scale(1.2)}}
.hugo-action{margin:6px 10px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);border-radius:6px;padding:10px;}
.ha-label{font-size:9px;color:var(--amber);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;}
.ha-desc{font-size:11px;margin-bottom:8px;}
.ha-btns{display:flex;gap:6px;}
.ha-yes{padding:4px 12px;border-radius:4px;font-size:10px;cursor:pointer;border:none;background:var(--green);color:#000;font-weight:700;font-family:var(--mono);}
.ha-no{padding:4px 10px;border-radius:4px;font-size:10px;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:var(--mono);}
.hugo-input-row{display:flex;gap:6px;padding:10px;border-top:1px solid var(--border);}
.hugo-in{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:7px 10px;color:var(--text);font-family:var(--mono);font-size:11px;outline:none;}
.hugo-in:focus{border-color:var(--cyan);}
.hugo-send{padding:7px 12px;border-radius:6px;border:none;background:var(--cyan);color:#000;font-weight:700;cursor:pointer;font-family:var(--mono);font-size:12px;}

/* LEAFLET popup override */
.leaflet-popup-content-wrapper{background:var(--card)!important;border:1px solid var(--bord2)!important;border-radius:8px!important;box-shadow:0 4px 20px rgba(0,0,0,.5)!important;}
.leaflet-popup-tip{background:var(--card)!important;}
.leaflet-popup-content{margin:10px 12px!important;color:var(--text)!important;font-family:'Space Mono',monospace!important;font-size:11px!important;}
`;

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (n: number|null|undefined, prefix='') =>
  n == null ? '—' : `${prefix}${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtN = (n: number|null|undefined) =>
  n == null ? '—' : n.toLocaleString('pt-BR');

const statusColor = (s: string) => {
  const m: Record<string,string> = {
    ejecutando:'green', en_camino:'amber', negociando:'cyan',
    confirmado:'cyan', completado:'muted', cancelado:'red', disputa:'red',
  };
  return m[s] || 'muted';
};

const alertIcon = (tipo: string) =>
  ({ karma_bajo:'⚠️', disputa_antigua:'🚨', escrow_pendiente:'💰', proveedor_inactivo:'😴' }[tipo] || '⚡');

const alertTitle = (tipo: string) =>
  ({ karma_bajo:'Karma bajo', disputa_antigua:'Disputa sin resolver', escrow_pendiente:'Escrow pendiente', proveedor_inactivo:'Proveedor inactivo' }[tipo] || tipo);

const timeAgo = (d: string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'ahora';
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
};

// ─── AdminPanel ──────────────────────────────────────────────
export function AdminPanel() {
  const [section, setSection]       = useState<Section>('dashboard');
  const [clock, setClock]           = useState('');
  const [usrTab, setUsrTab]         = useState<UsrTab>('perfiles');
  const [usrFilter, setUsrFilter]   = useState<'all'|'proveedor'|'cliente'>('all');
  const [authEnabled, setAuthEnabled] = useState(false);

  // Map
  const [leafletReady, setLeafletReady] = useState(false);
  const [selectedProv, setSelectedProv] = useState<any>(null);
  const mapDivRef   = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<any>(null);
  const markersRef  = useRef<any[]>([]);

  // Document preview
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string|null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [docNotes, setDocNotes]     = useState('');

  // Disputa modal
  const [disputeModal, setDisputeModal] = useState<any>(null);
  const [disputeRes, setDisputeRes]     = useState('');
  const [disputeFavor, setDisputeFavor] = useState<'cliente'|'proveedor'>('cliente');

  // Hugo
  const [chat, setChat]       = useState<ChatMsg[]>([
    { role:'hugo', text:'Sistema U.GO activo. Bóveda, proveedores y disputas monitoreadas. ¿Qué necesitás?', ts: new Date() },
  ]);
  const [input, setInput]     = useState('');
  const [hugoLoading, setHugoLoading] = useState(false);
  const [pendingAct, setPendingAct]   = useState<string|null>(null);
  const msgEndRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // Data
  const { metrics }                  = useDashboardMetrics();
  const kpis                         = useConversionKPIs();
  const { alerts, criticalCount, warningCount } = useSystemAlerts();
  const { providers: mapProviders }  = useMapProviders();
  const { services }                 = useActiveServices();
  const { disputes, resolverDisputa }= useOpenDisputes();
  const { docs, updateEstado, getSignedUrl } = usePendingDocuments();
  const feed                         = useActivityFeed();
  const weekData                     = useWeekMetrics();
  const { users, suspenderProveedor, reactivarProveedor } = useUsuarios();
  const { users: authUsers, loading: authLoading } = useAuthUsers(authEnabled);
  const { escrows, liberarEscrow }   = useVault();
  const withdrawals                  = usePendingWithdrawals();

  // Clock
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Load Leaflet from CDN once
  useEffect(() => {
    if ((window as any).L) { setLeafletReady(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.body.appendChild(script);
  }, []);

  // Init Leaflet map
  useEffect(() => {
    if (!leafletReady || !mapDivRef.current || mapRef.current) return;
    const L = (window as any).L;
    mapRef.current = L.map(mapDivRef.current, {
      center: [-27.5954, -48.5480], zoom: 13, zoomControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
    }).addTo(mapRef.current);
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
  }, [leafletReady]);

  // Invalidate map size when switching to map section
  useEffect(() => {
    if (section === 'mapa' && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 60);
    }
  }, [section]);

  // Update map markers
  useEffect(() => {
    if (!mapRef.current || !leafletReady) return;
    const L = (window as any).L;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    mapProviders.forEach(p => {
      if (!p.lat || !p.lng) return;
      const color = p.disponible ? '#00e57a' : '#f59e0b';
      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #070a0d;box-shadow:0 0 8px ${color}88;"></div>`,
        className: '', iconSize: [12,12], iconAnchor: [6,6],
      });
      const marker = L.marker([p.lat, p.lng], { icon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="font-family:'Space Mono',monospace;">
            <div style="color:#00f2ff;font-weight:700;margin-bottom:4px;">${p.nombre} ${p.apellido||''}</div>
            <div>⭐ ${p.karma} · ${p.servicios_completados} servicios</div>
            <div style="margin-top:2px;">${p.disponible ? '🟢 Disponible' : `🟡 ${p.categoria_nombre||'En trabajo'}`}</div>
            ${p.zona ? `<div style="color:#888;font-size:10px;margin-top:2px;">${p.zona}</div>` : ''}
          </div>
        `);
      marker.on('click', () => setSelectedProv(p));
      markersRef.current.push(marker);
    });
  }, [mapProviders, leafletReady]);

  // Scroll Hugo to bottom
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [chat, hugoLoading]);

  // Enable auth users when on auth tab
  useEffect(() => {
    if (usrTab === 'auth') setAuthEnabled(true);
  }, [usrTab]);

  // ── Hugo send ──
  const sendHugo = useCallback(async (text: string) => {
    if (!text.trim() || hugoLoading) return;
    setInput('');
    setChat(c => [...c, { role:'admin', text, ts: new Date() }]);
    setHugoLoading(true);

    const ctx = metrics ? `
Servicios activos: ${metrics.servicios_activos}
Bóveda: R$${metrics.boveda_total}
Proveedores online: ${metrics.proveedores_online}/${metrics.proveedores_total}
Disputas abiertas: ${metrics.disputas_abiertas} (R$${metrics.monto_disputado})
Ingresos hoy: R$${metrics.ingresos_hoy} | Mes: R$${metrics.ingresos_mes}
Docs pendientes: ${metrics.docs_pendientes}
Alertas críticas: ${criticalCount}
` : '';

    const history = chat.slice(-8).map(m => ({
      role: m.role === 'admin' ? 'user' : 'assistant',
      content: m.text,
    }));

    try {
      const res = await fetch('/api/hugo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'admin',
          message: text,
          context: ctx,
          history,
        }),
      });
      const data = await res.json();
      const msg = data.hugo_mensaje || data.message || 'Error al procesar.';
      const action = data.accion;
      const actionMatch = msg.match(/\[ACCION:\s*([^\]]+)\]/i);
      const cleanMsg = msg.replace(/\[ACCION:[^\]]+\]/gi, '').trim();
      if (actionMatch) setPendingAct(actionMatch[1].trim());
      setChat(c => [...c, { role:'hugo', text: cleanMsg, action, ts: new Date() }]);
    } catch {
      setChat(c => [...c, { role:'hugo', text:'Error de conexión con Hugo.', ts: new Date() }]);
    } finally {
      setHugoLoading(false);
    }
  }, [chat, hugoLoading, metrics, criticalCount]);

  // ── Document preview ──
  const openPreview = useCallback(async (doc: any) => {
    setPreviewDoc(doc);
    setDocNotes(doc.notas || '');
    setPreviewUrl(null);
    if (doc.url_storage) {
      setPreviewLoading(true);
      const url = await getSignedUrl(doc.url_storage);
      setPreviewUrl(url);
      setPreviewLoading(false);
    }
  }, [getSignedUrl]);

  // ── Computed ──
  const maxRevenue = useMemo(
    () => Math.max(1, ...weekData.map(d => Number(d.ingresos_brutos) || 0)),
    [weekData]
  );

  const provDisp  = mapProviders.filter(p => p.disponible).length;
  const provWork  = mapProviders.filter(p => !p.disponible).length;
  const filtUsers = useMemo(
    () => users.filter(u => usrFilter === 'all' || u.tipo === usrFilter),
    [users, usrFilter]
  );

  // ══════════════════════════════════════════════════════════
  // RENDER SECTIONS
  // ══════════════════════════════════════════════════════════

  const renderDashboard = () => (
    <div className="main-pad">
      <div className="section-title">Dashboard</div>

      {/* Metric cards */}
      <div className="metric-grid">
        {[
          { label:'Servicios activos', val: fmtN(metrics?.servicios_activos), sub:'en tiempo real', color:'var(--cyan)' },
          { label:'Bóveda', val: fmt(Number(metrics?.boveda_total),'R$'), sub:'fondos retenidos', color:'var(--green)' },
          { label:'Proveedores online', val: `${fmtN(metrics?.proveedores_online)}/${fmtN(metrics?.proveedores_total)}`, sub:'disponibles ahora', color:'var(--amber)' },
          { label:'Disputas abiertas', val: fmtN(metrics?.disputas_abiertas), sub: fmt(Number(metrics?.monto_disputado),'R$') + ' retenidos', color:'var(--red)' },
          { label:'Ingresos hoy', val: fmt(Number(metrics?.ingresos_hoy),'R$'), sub: fmt(Number(metrics?.ingresos_mes),'R$') + ' este mes', color:'var(--green)' },
          { label:'Docs pendientes', val: fmtN(metrics?.docs_pendientes), sub:'por revisar', color:'var(--purple)' },
        ].map(m => (
          <div key={m.label} className="metric-card" style={{ color: m.color }}>
            <div className="mc-label">{m.label}</div>
            <div className="mc-value" style={{ color: m.color }}>{m.val}</div>
            <div className="mc-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* KPI conversion row */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ color:'var(--green)' }}>
          <div className="kpi-label">Conversión 30d</div>
          <div className="kpi-value" style={{color:'var(--green)'}}>{kpis?.tasa_conversion_pct ?? '—'}%</div>
          <div className="kpi-sub">{fmtN(kpis?.confirmados)} de {fmtN(kpis?.total_solicitudes)} solicitudes</div>
        </div>
        <div className="kpi-card" style={{ color:'var(--cyan)' }}>
          <div className="kpi-label">Tiempo respuesta</div>
          <div className="kpi-value" style={{color:'var(--cyan)'}}>{kpis?.tiempo_respuesta_prom_min ?? '—'}<span style={{fontSize:11}}> min</span></div>
          <div className="kpi-sub">solicitud → confirmación</div>
        </div>
        <div className="kpi-card" style={{ color:'var(--red)' }}>
          <div className="kpi-label">Tasa abandono</div>
          <div className="kpi-value" style={{color:'var(--red)'}}>{kpis?.tasa_abandono_pct ?? '—'}%</div>
          <div className="kpi-sub">{fmtN(kpis?.cancelados)} cancelados</div>
        </div>
        <div className="kpi-card" style={{ color:'var(--amber)' }}>
          <div className="kpi-label">Ticket promedio</div>
          <div className="kpi-value" style={{color:'var(--amber)'}}>{fmt(Number(kpis?.ticket_prom),'R$')}</div>
          <div className="kpi-sub">comisión: {fmt(Number(kpis?.comision_total),'R$')}</div>
        </div>
      </div>

      {/* Chart + Alerts widget */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-title">Ingresos últimos 7 días</div>
          <div className="chart-bars">
            {weekData.map(d => {
              const h = Math.max(4, Math.round((Number(d.ingresos_brutos) / maxRevenue) * 80));
              const dia = new Date(d.fecha + 'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'});
              return (
                <div key={d.fecha} className="chart-bar-wrap">
                  <div className="chart-bar" style={{height:h}} title={`R$ ${d.ingresos_brutos}`} />
                  <div className="chart-bar-label">{dia}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="alert-widget">
          <div className="aw-title">
            <span>⚡ Sistema</span>
            {(criticalCount+warningCount) > 0 && (
              <span style={{color:'var(--red)',cursor:'pointer'}} onClick={() => setSection('alertas')}>
                {criticalCount+warningCount} alertas →
              </span>
            )}
          </div>
          {alerts.length === 0
            ? <div className="aw-empty">✅ Sin alertas activas</div>
            : alerts.slice(0,4).map((a,i) => (
              <div key={i} className="aw-item">
                <div className="aw-dot" style={{background: a.severidad==='critical'?'var(--red)':a.severidad==='warning'?'var(--amber)':'var(--purple)'}} />
                <div className="aw-text">{a.descripcion}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Activity feed */}
      <div className="feed-card">
        <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:8}}>Actividad reciente</div>
        {feed.slice(0,10).map(e => (
          <div key={e.id} className="feed-item">
            <div className="feed-dot" />
            <div className="feed-text">
              <span style={{color:'var(--cyan)'}}>{e.evento.replace(/_/g,' ')}</span>
              {e.detalles?.zona && <span style={{color:'var(--muted)'}}> · {e.detalles.zona}</span>}
              {e.detalles?.monto && <span style={{color:'var(--green)'}}> · R${e.detalles.monto}</span>}
            </div>
            <div className="feed-time">{timeAgo(e.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAlertas = () => (
    <div className="alerts-wrap">
      <div className="section-title">
        Alertas del sistema
        {(criticalCount+warningCount) > 0 && (
          <span style={{fontSize:12,fontFamily:'var(--mono)',color:'var(--muted)',marginLeft:10}}>
            {criticalCount} críticas · {warningCount} advertencias
          </span>
        )}
      </div>
      {alerts.length === 0 ? (
        <div className="alert-empty">✅ Sin alertas activas — sistema nominal</div>
      ) : (
        alerts.map((a,i) => (
          <div key={i} className={`alert-card alert-${a.severidad}`}>
            <div className="alert-icon">{alertIcon(a.tipo)}</div>
            <div className="alert-body">
              <div className="alert-title">{alertTitle(a.tipo)}</div>
              <div className="alert-desc">{a.descripcion}</div>
              <div className="alert-actions">
                <button className="btn-primary" onClick={() => sendHugo(`Analiza esta alerta: ${a.descripcion}`)}>
                  Consultar Hugo
                </button>
                {a.tipo === 'disputa_antigua' && (
                  <button className="btn-secondary" onClick={() => setSection('disputas')}>Ver disputa</button>
                )}
                {a.tipo === 'escrow_pendiente' && (
                  <button className="btn-secondary" onClick={() => setSection('finanzas')}>Ver escrow</button>
                )}
                {a.tipo === 'karma_bajo' && (
                  <button className="btn-danger" onClick={() => sendHugo(`Considera suspender proveedor con karma bajo: ${a.descripcion}`)}>
                    Suspender
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderServicios = () => (
    <div className="main-pad">
      <div className="section-title">Servicios activos</div>
      <div className="table-wrap">
        <div className="table-head">
          <div className="tc" style={{flex:2}}>Servicio</div>
          <div className="tc" style={{flex:1.5}}>Cliente</div>
          <div className="tc" style={{flex:1.5}}>Proveedor</div>
          <div className="tc" style={{flex:1}}>Estado</div>
          <div className="tc" style={{flex:1}}>Tarifa</div>
          <div className="tc" style={{flex:1}}>Hace</div>
        </div>
        {services.map(s => (
          <div key={s.id} className="table-row">
            <div className="tc" style={{flex:2}}>
              <span style={{color:'var(--text)'}}>{(s as any).categorias?.emoji} {(s as any).categorias?.nombre || '—'}</span>
              <div style={{fontSize:10,color:'var(--muted)'}}>{s.zona}</div>
            </div>
            <div className="tc" style={{flex:1.5}}>{(s as any).clientes?.nombre || '—'}</div>
            <div className="tc" style={{flex:1.5}}>{(s as any).proveedores?.nombre || '—'}</div>
            <div className="tc" style={{flex:1}}>
              <span className={`pill pill-${statusColor(s.estado)}`}>{s.estado}</span>
            </div>
            <div className="tc" style={{flex:1,color:'var(--green)'}}>{s.tarifa ? `R$${s.tarifa}` : '—'}</div>
            <div className="tc" style={{flex:1,color:'var(--muted)'}}>{timeAgo(s.created_at!)}</div>
          </div>
        ))}
        {services.length === 0 && (
          <div style={{padding:'24px',textAlign:'center',color:'var(--muted)',fontSize:11}}>No hay servicios activos</div>
        )}
      </div>
    </div>
  );

  const renderDisputas = () => (
    <div className="main-pad">
      <div className="section-title">Disputas abiertas</div>
      {disputes.map(d => (
        <div key={d.id} className="alert-card alert-critical" style={{marginBottom:8}}>
          <div className="alert-icon">⚖️</div>
          <div className="alert-body">
            <div className="alert-title">{d.numero} — {fmt(Number(d.monto_disputado),'R$')}</div>
            <div className="alert-desc">
              {(d as any).clientes?.nombre} vs {(d as any).proveedores?.nombre} · {d.motivo}
            </div>
            <div style={{marginTop:4}}>
              <span className={`pill pill-${d.estado==='abierta'?'red':'amber'}`}>{d.estado}</span>
              <span style={{color:'var(--muted)',fontSize:10,marginLeft:8}}>Abierta hace {timeAgo(d.created_at!)}</span>
            </div>
            <div className="alert-actions">
              <button className="btn-primary" onClick={() => { setDisputeModal(d); setDisputeRes(''); }}>
                Resolver
              </button>
              <button className="btn-secondary" onClick={() => sendHugo(`Analiza la disputa ${d.numero}: ${d.motivo}. Monto: R$${d.monto_disputado}`)}>
                Consultar Hugo
              </button>
            </div>
          </div>
        </div>
      ))}
      {disputes.length === 0 && (
        <div style={{textAlign:'center',padding:'40px',color:'var(--green)',fontSize:12}}>✅ Sin disputas abiertas</div>
      )}
    </div>
  );

  const renderUsuarios = () => (
    <div className="main-pad">
      <div className="section-title">Usuarios</div>
      <div className="tab-row">
        {(['perfiles','auth'] as UsrTab[]).map(t => (
          <button key={t} className={`tab-btn${usrTab===t?' active':''}`} onClick={() => setUsrTab(t)}>
            {t === 'perfiles' ? `Perfiles (${users.length})` : `Auth Users${authUsers.length ? ` (${authUsers.length})` : ''}`}
          </button>
        ))}
        {usrTab === 'perfiles' && (
          <div style={{marginLeft:'auto',display:'flex',gap:4}}>
            {(['all','proveedor','cliente'] as const).map(f => (
              <button key={f} className={`tab-btn${usrFilter===f?' active':''}`} onClick={() => setUsrFilter(f)}>
                {f === 'all' ? 'Todos' : f}
              </button>
            ))}
          </div>
        )}
      </div>

      {usrTab === 'perfiles' ? (
        <div className="table-wrap">
          <div className="table-head">
            <div className="tc" style={{flex:2}}>Nombre</div>
            <div className="tc" style={{flex:2}}>Email</div>
            <div className="tc" style={{flex:1}}>Tipo</div>
            <div className="tc" style={{flex:1}}>Karma</div>
            <div className="tc" style={{flex:1}}>Estado</div>
            <div className="tc" style={{flex:1}}>Acciones</div>
          </div>
          {filtUsers.map(u => (
            <div key={u.id} className="table-row">
              <div className="tc" style={{flex:2}}>
                {u.nombre} {u.apellido || ''}
                {u.online && <span style={{color:'var(--green)',marginLeft:4,fontSize:9}}>● online</span>}
              </div>
              <div className="tc" style={{flex:2,color:'var(--muted)'}}>{u.email}</div>
              <div className="tc" style={{flex:1}}>
                <span className={`pill pill-${u.tipo==='admin'?'cyan':u.tipo==='proveedor'?'amber':'muted'}`}>{u.tipo}</span>
              </div>
              <div className="tc" style={{flex:1,color: Number(u.karma)<4?'var(--red)':'var(--text)'}}>
                {u.karma} ⭐
              </div>
              <div className="tc" style={{flex:1}}>
                <span className={`pill pill-${u.activo?'green':'red'}`}>{u.activo?'activo':'inactivo'}</span>
              </div>
              <div className="tc" style={{flex:1,display:'flex',gap:4}}>
                {u.tipo === 'proveedor' && u.activo && (
                  <button className="btn-danger" style={{fontSize:9,padding:'2px 8px'}} onClick={() => suspenderProveedor(u.id, 'Suspensión manual desde panel')}>
                    Suspender
                  </button>
                )}
                {u.tipo === 'proveedor' && !u.activo && (
                  <button className="btn-primary" style={{fontSize:9,padding:'2px 8px'}} onClick={() => reactivarProveedor(u.id)}>
                    Reactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-head">
            <div className="tc" style={{flex:2.5}}>Email</div>
            <div className="tc" style={{flex:1.5}}>Nombre perfil</div>
            <div className="tc" style={{flex:1}}>Tipo</div>
            <div className="tc" style={{flex:1}}>Email conf.</div>
            <div className="tc" style={{flex:1}}>Perfil</div>
            <div className="tc" style={{flex:1}}>Último login</div>
          </div>
          {authLoading ? (
            <div style={{padding:'20px',textAlign:'center',color:'var(--muted)'}}>Cargando auth users...</div>
          ) : authUsers.map((u,i) => (
            <div key={i} className="table-row">
              <div className="tc" style={{flex:2.5}}>{u.email}</div>
              <div className="tc" style={{flex:1.5,color:'var(--muted)'}}>{u.usuario_nombre?.trim() || '—'}</div>
              <div className="tc" style={{flex:1}}>
                {u.usuario_tipo ? <span className={`pill pill-${u.usuario_tipo==='proveedor'?'amber':'muted'}`}>{u.usuario_tipo}</span> : <span className="pill pill-muted">sin perfil</span>}
              </div>
              <div className="tc" style={{flex:1}}>
                <span className={`pill pill-${u.email_confirmed?'green':'red'}`}>{u.email_confirmed?'sí':'no'}</span>
              </div>
              <div className="tc" style={{flex:1}}>
                <span className={`pill pill-${u.has_profile?'green':'amber'}`}>{u.has_profile?'completo':'pendiente'}</span>
              </div>
              <div className="tc" style={{flex:1,color:'var(--muted)'}}>
                {u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : 'nunca'}
              </div>
            </div>
          ))}
          {!authLoading && authUsers.length === 0 && (
            <div style={{padding:'24px',textAlign:'center',color:'var(--muted)',fontSize:11}}>Sin registros en auth.users</div>
          )}
        </div>
      )}
    </div>
  );

  const renderDocumentos = () => (
    <div className="main-pad">
      <div className="section-title">Verificación de documentos</div>
      <div className="table-wrap">
        <div className="table-head">
          <div className="tc" style={{flex:2}}>Proveedor</div>
          <div className="tc" style={{flex:1.5}}>Documento</div>
          <div className="tc" style={{flex:1}}>Estado</div>
          <div className="tc" style={{flex:1}}>OCR</div>
          <div className="tc" style={{flex:1}}>Hace</div>
          <div className="tc" style={{flex:1.5}}>Acciones</div>
        </div>
        {docs.map(d => (
          <div key={d.id} className="table-row">
            <div className="tc" style={{flex:2}}>
              {(d as any).usuarios?.nombre} {(d as any).usuarios?.apellido || ''}
              <div style={{fontSize:10,color:'var(--muted)'}}>{(d as any).usuarios?.email}</div>
            </div>
            <div className="tc" style={{flex:1.5}}>{d.tipo.toUpperCase()} <span style={{color:'var(--muted)',fontSize:10}}>· {d.descripcion}</span></div>
            <div className="tc" style={{flex:1}}>
              <span className={`pill pill-${d.estado==='pendiente'?'amber':d.estado==='procesando'?'cyan':'muted'}`}>{d.estado}</span>
            </div>
            <div className="tc" style={{flex:1}}>
              {d.ocr_valido === true ? <span style={{color:'var(--green)'}}>✓ válido</span>
               : d.ocr_valido === false ? <span style={{color:'var(--red)'}}>✗ inválido</span>
               : <span style={{color:'var(--muted)'}}>pendiente</span>}
            </div>
            <div className="tc" style={{flex:1,color:'var(--muted)'}}>{timeAgo(d.created_at!)}</div>
            <div className="tc" style={{flex:1.5,display:'flex',gap:4}}>
              <button className="btn-secondary" style={{fontSize:9,padding:'2px 8px'}} onClick={() => openPreview(d)}>
                Ver
              </button>
              <button className="btn-primary" style={{fontSize:9,padding:'2px 8px'}} onClick={() => updateEstado(d.id,'aprobado')}>
                ✓
              </button>
              <button className="btn-danger" style={{fontSize:9,padding:'2px 8px'}} onClick={() => updateEstado(d.id,'rechazado')}>
                ✗
              </button>
            </div>
          </div>
        ))}
        {docs.length === 0 && (
          <div style={{padding:'24px',textAlign:'center',color:'var(--muted)',fontSize:11}}>Sin documentos pendientes</div>
        )}
      </div>
    </div>
  );

  const renderFinanzas = () => (
    <div className="main-pad">
      <div className="section-title">Finanzas & Bóveda</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
        <div className="metric-card" style={{color:'var(--green)'}}>
          <div className="mc-label">Bóveda retenida</div>
          <div className="mc-value" style={{color:'var(--green)'}}>{fmt(escrows.reduce((a,e)=>a+Number(e.monto_total),0),'R$')}</div>
          <div className="mc-sub">{escrows.length} escrows activos</div>
        </div>
        <div className="metric-card" style={{color:'var(--cyan)'}}>
          <div className="mc-label">Comisión acumulada</div>
          <div className="mc-value" style={{color:'var(--cyan)'}}>{fmt(Number(kpis?.comision_total),'R$')}</div>
          <div className="mc-sub">últimos 30 días</div>
        </div>
        <div className="metric-card" style={{color:'var(--amber)'}}>
          <div className="mc-label">Retiros pendientes</div>
          <div className="mc-value" style={{color:'var(--amber)'}}>{fmt(withdrawals.reduce((a,w)=>a+Number(w.monto_proveedor),0),'R$')}</div>
          <div className="mc-sub">{withdrawals.length} proveedores</div>
        </div>
      </div>

      <div style={{marginBottom:8,fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'1px'}}>Escrows retenidos</div>
      <div className="table-wrap">
        <div className="table-head">
          <div className="tc" style={{flex:1.5}}>Cliente</div>
          <div className="tc" style={{flex:1.5}}>Proveedor</div>
          <div className="tc" style={{flex:1}}>Total</div>
          <div className="tc" style={{flex:1}}>Comisión</div>
          <div className="tc" style={{flex:1}}>Neto proveedor</div>
          <div className="tc" style={{flex:1}}>Hace</div>
          <div className="tc" style={{flex:1}}>Liberar</div>
        </div>
        {escrows.map(e => (
          <div key={e.id} className="table-row">
            <div className="tc" style={{flex:1.5}}>{(e as any).clientes?.nombre || '—'}</div>
            <div className="tc" style={{flex:1.5}}>{(e as any).proveedores?.nombre || '—'}</div>
            <div className="tc" style={{flex:1,color:'var(--green)'}}>{fmt(Number(e.monto_total),'R$')}</div>
            <div className="tc" style={{flex:1,color:'var(--cyan)'}}>{fmt(Number(e.comision_ugo),'R$')}</div>
            <div className="tc" style={{flex:1,color:'var(--text)'}}>{fmt(Number(e.monto_proveedor),'R$')}</div>
            <div className="tc" style={{flex:1,color:'var(--muted)'}}>{timeAgo(e.created_at)}</div>
            <div className="tc" style={{flex:1}}>
              <button className="btn-primary" style={{fontSize:9,padding:'2px 10px'}} onClick={() => liberarEscrow(e.id)}>
                Liberar
              </button>
            </div>
          </div>
        ))}
        {escrows.length === 0 && (
          <div style={{padding:'24px',textAlign:'center',color:'var(--muted)',fontSize:11}}>Bóveda vacía</div>
        )}
      </div>
    </div>
  );

  // ─── NAV config ──────────────────────────────────────────
  const NAV: { id:Section; icon:string; label:string; badge?:number }[] = [
    { id:'dashboard',  icon:'◈', label:'Panel' },
    { id:'mapa',       icon:'◉', label:'Mapa' },
    { id:'alertas',    icon:'△', label:'Alertas', badge: criticalCount+warningCount || undefined },
    { id:'servicios',  icon:'⊞', label:'Servicios' },
    { id:'disputas',   icon:'⊘', label:'Disputas', badge: disputes.length || undefined },
    { id:'usuarios',   icon:'◎', label:'Usuarios' },
    { id:'documentos', icon:'⊟', label:'Docs', badge: docs.length || undefined },
    { id:'finanzas',   icon:'⊛', label:'Finanzas' },
  ];

  // ══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <>
      <style>{CSS}</style>
      <div className="ua">

        {/* TOP BAR */}
        <div className="ua-tb">
          <div>
            <div className="ua-logo">U.GO</div>
            <div className="ua-logo-sub">Quantum OS</div>
          </div>
          {metrics && <>
            {criticalCount > 0 && (
              <div className="ua-chip chip-r" onClick={() => setSection('alertas')}>
                🚨 {criticalCount} críticas
              </div>
            )}
            {disputes.length > 0 && (
              <div className="ua-chip chip-a">⚖️ {disputes.length} disputas</div>
            )}
          </>}
          <div className="ua-tb-r">
            <div className="live-pill"><div className="live-dot"/>LIVE</div>
            <div className="ua-clock">{clock}</div>
          </div>
        </div>

        {/* SIDE NAV */}
        <nav className="ua-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item${section===n.id?' active':''}`}
              onClick={() => setSection(n.id)}
            >
              {n.badge ? <div className="nav-badge">{n.badge > 9 ? '9+' : n.badge}</div> : null}
              <span>{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>

        {/* MAIN CONTENT */}
        <main className="ua-main">
          {/* Map: always in DOM to preserve Leaflet state */}
          <div className="map-wrap" style={{display: section==='mapa'?'block':'none'}}>
            <div className="map-stats">
              <div className="map-stat-pill">
                <span style={{color:'var(--green)'}}>●</span>
                {provDisp} libres
              </div>
              <div className="map-stat-pill">
                <span style={{color:'var(--amber)'}}>●</span>
                {provWork} en servicio
              </div>
              <div className="map-stat-pill">
                <span style={{color:'var(--muted)'}}>◎</span>
                {mapProviders.length} online total
              </div>
            </div>
            <div ref={mapDivRef} style={{height:'100%',width:'100%',background:'var(--bg)'}} />
            <div className="map-sidebar">
              <div className="map-sb-head">Proveedores online</div>
              {mapProviders.map(p => (
                <div
                  key={p.id}
                  className="map-prov-item"
                  onClick={() => {
                    setSelectedProv(p);
                    if (mapRef.current && p.lat && p.lng) {
                      mapRef.current.setView([p.lat, p.lng], 15);
                    }
                  }}
                >
                  <div className="map-prov-name">
                    <span className="map-prov-status" style={{background: p.disponible?'var(--green)':'var(--amber)'}} />
                    {p.nombre} {p.apellido||''}
                  </div>
                  <div className="map-prov-sub">
                    ⭐{p.karma} · {p.disponible ? 'disponible' : (p.categoria_nombre||'en trabajo')}
                  </div>
                </div>
              ))}
              {mapProviders.length === 0 && (
                <div style={{padding:'16px',textAlign:'center',color:'var(--muted)',fontSize:10}}>Sin proveedores online</div>
              )}
            </div>
            <div className="map-legend">
              <span><span className="leg-dot" style={{background:'var(--green)'}}/>Disponible</span>
              <span><span className="leg-dot" style={{background:'var(--amber)'}}/>En servicio</span>
            </div>
          </div>

          {/* Other sections (conditionally rendered) */}
          {section === 'dashboard'  && renderDashboard()}
          {section === 'alertas'    && renderAlertas()}
          {section === 'servicios'  && renderServicios()}
          {section === 'disputas'   && renderDisputas()}
          {section === 'usuarios'   && renderUsuarios()}
          {section === 'documentos' && renderDocumentos()}
          {section === 'finanzas'   && renderFinanzas()}
        </main>

        {/* HUGO ADMIN PANEL */}
        <aside className="ua-hugo">
          <div className="hugo-header">
            <div className="hugo-orb" />
            <div>
              <div className="hugo-name">Hugo</div>
              <div className="hugo-mode">modo admin · sebastián zoth</div>
            </div>
          </div>
          <div className="hugo-msgs">
            {chat.map((m,i) => (
              <div key={i}>
                <div className={`hm hm-${m.role}`}>{m.text}</div>
                <div className="hm-time">{m.ts.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            ))}
            {hugoLoading && (
              <div className="hugo-typing">
                <div className="ht-dot"/><div className="ht-dot"/><div className="ht-dot"/>
              </div>
            )}
            {pendingAct && (
              <div className="hugo-action">
                <div className="ha-label">⚡ Acción pendiente</div>
                <div className="ha-desc">{pendingAct}</div>
                <div className="ha-btns">
                  <button className="ha-yes" onClick={() => { sendHugo(`Autorizado. Ejecuta: ${pendingAct}`); setPendingAct(null); }}>
                    ✓ Autorizar
                  </button>
                  <button className="ha-no" onClick={() => { setChat(c=>[...c,{role:'admin',text:'Cancelado.',ts:new Date()}]); setPendingAct(null); }}>
                    ✗ Cancelar
                  </button>
                </div>
              </div>
            )}
            <div ref={msgEndRef} />
          </div>
          <div className="hugo-input-row">
            <input
              ref={inputRef}
              className="hugo-in"
              placeholder="Pregunta al orbe admin..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && sendHugo(input)}
            />
            <button className="hugo-send" onClick={() => sendHugo(input)}>→</button>
          </div>
        </aside>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="modal-bd" onClick={e => { if(e.target===e.currentTarget) { setPreviewDoc(null); setPreviewUrl(null); }}}>
          <div className="modal-box">
            <div className="modal-title">
              <span>📄 {previewDoc.tipo?.toUpperCase()} — {(previewDoc.usuarios?.nombre||'')} {previewDoc.usuarios?.apellido||''}</span>
              <button className="modal-close" onClick={() => { setPreviewDoc(null); setPreviewUrl(null); }}>✕</button>
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <div className="mf-label">Tipo</div>
                <div className="mf-value">{previewDoc.tipo}</div>
              </div>
              <div className="modal-field">
                <div className="mf-label">Estado actual</div>
                <div className="mf-value"><span className={`pill pill-${previewDoc.estado==='pendiente'?'amber':'cyan'}`}>{previewDoc.estado}</span></div>
              </div>
              <div className="modal-field">
                <div className="mf-label">Descripción</div>
                <div className="mf-value">{previewDoc.descripcion || '—'}</div>
              </div>
              <div className="modal-field">
                <div className="mf-label">Hace</div>
                <div className="mf-value">{timeAgo(previewDoc.created_at)}</div>
              </div>
            </div>

            {previewLoading && (
              <div style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>Cargando documento...</div>
            )}
            {previewUrl && !previewLoading && (
              previewUrl.includes('.pdf') || previewDoc.url_storage?.includes('.pdf')
                ? <iframe src={previewUrl} className="modal-pdf" title="doc preview" />
                : <img src={previewUrl} className="modal-preview" alt="documento" />
            )}
            {!previewUrl && !previewLoading && (
              <div style={{textAlign:'center',padding:'24px',color:'var(--muted)',fontSize:11,background:'var(--bg2)',borderRadius:6}}>
                Sin archivo adjunto — verificación manual requerida
              </div>
            )}

            <div style={{marginTop:12,fontSize:10,color:'var(--muted)'}}>Notas para el proveedor:</div>
            <textarea
              className="modal-textarea"
              value={docNotes}
              onChange={e => setDocNotes(e.target.value)}
              placeholder="Razón de aprobación/rechazo (opcional)..."
            />
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => { updateEstado(previewDoc.id,'aprobado',docNotes); setPreviewDoc(null); setPreviewUrl(null); }}>
                ✓ Aprobar documento
              </button>
              <button className="btn-danger" onClick={() => { updateEstado(previewDoc.id,'rechazado',docNotes); setPreviewDoc(null); setPreviewUrl(null); }}>
                ✗ Rechazar
              </button>
              <button className="btn-secondary" onClick={() => { updateEstado(previewDoc.id,'reenvio_solicitado',docNotes); setPreviewDoc(null); setPreviewUrl(null); }}>
                ↺ Pedir reenvío
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTA RESOLVE MODAL */}
      {disputeModal && (
        <div className="modal-bd" onClick={e => { if(e.target===e.currentTarget) setDisputeModal(null); }}>
          <div className="modal-box">
            <div className="modal-title">
              <span>⚖️ Resolver {disputeModal.numero}</span>
              <button className="modal-close" onClick={() => setDisputeModal(null)}>✕</button>
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <div className="mf-label">Monto disputado</div>
                <div className="mf-value" style={{color:'var(--red)'}}>{fmt(Number(disputeModal.monto_disputado),'R$')}</div>
              </div>
              <div className="modal-field">
                <div className="mf-label">Partes</div>
                <div className="mf-value">{(disputeModal as any).clientes?.nombre} vs {(disputeModal as any).proveedores?.nombre}</div>
              </div>
            </div>
            <div className="modal-field" style={{marginBottom:10}}>
              <div className="mf-label">Motivo</div>
              <div className="mf-value">{disputeModal.motivo}</div>
            </div>

            <div style={{fontSize:10,color:'var(--muted)',marginBottom:6}}>Resolver a favor de:</div>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <button
                className={disputeFavor==='cliente'?'btn-primary':'btn-secondary'}
                onClick={() => setDisputeFavor('cliente')}
              >
                👤 Cliente
              </button>
              <button
                className={disputeFavor==='proveedor'?'btn-primary':'btn-secondary'}
                onClick={() => setDisputeFavor('proveedor')}
              >
                🔧 Proveedor
              </button>
            </div>

            <div style={{fontSize:10,color:'var(--muted)',marginBottom:4}}>Resolución:</div>
            <textarea
              className="modal-textarea"
              value={disputeRes}
              onChange={e => setDisputeRes(e.target.value)}
              placeholder="Detalla la resolución y justificación..."
            />
            <div className="modal-actions">
              <button
                className="btn-primary"
                disabled={!disputeRes.trim()}
                onClick={async () => {
                  await resolverDisputa(disputeModal.id, disputeRes, disputeFavor);
                  setDisputeModal(null);
                }}
              >
                ✓ Confirmar resolución
              </button>
              <button className="btn-secondary" onClick={() => sendHugo(`Necesito ayuda para resolver la disputa ${disputeModal.numero}: ${disputeModal.motivo}`)}>
                Consultar Hugo primero
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminPanel;
