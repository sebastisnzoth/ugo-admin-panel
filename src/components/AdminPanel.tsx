import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useDashboardMetrics, useConversionKPIs, useSystemAlerts, useMapProviders,
  useActiveServices, useOpenDisputes, usePendingDocuments, useActivityFeed,
  useWeekMetrics, useUsuarios, useAuthUsers, useCategorias, useTarifas,
  useConfigSistema, useNotificaciones, useServiciosCRUD, useExport,
  useVault, usePendingWithdrawals,
} from '../hooks/useAdminData';
import { supabase } from '../lib/supabase';
import { resetRealtimeChannel, onRealtimeEvent } from '../hooks/useAdminData';
import { SecZonas, SecPromos, SecRatings, SecAvanzado } from './AdvancedSections';
import { ConversationalOrb } from './ConversationalOrb';

type Section = 'dashboard'|'mapa'|'alertas'|'servicios'|'disputas'|'usuarios'|'documentos'|'finanzas'|'categorias'|'tarifas'|'notificaciones'|'reportes'|'config'|'zonas'|'promos'|'ratings'|'avanzado'|'conexiones'|'scout';
type ModalType = 'cat-form'|'user-form'|'servicio-form'|'tarifa-form'|'doc-preview'|'disputa'|'user-edit'|null;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
.ua*,.ua *::before,.ua *::after{box-sizing:border-box;margin:0;padding:0;}
.ua{--bg:#F2F3F5;--bg2:#FFFFFF;--bg3:#E8EAED;--card:#FFFFFF;--border:rgba(0,0,0,.12);--bord2:rgba(0,0,0,.22);--cyan:#05944F;--cdim:rgba(5,148,79,.08);--text:#111;--muted:rgba(0,0,0,.45);--green:#05944F;--amber:#996000;--red:#E11900;--purple:#7356BF;--blue:#276EF1;--head:'Inter',sans-serif;--mono:'Inter',sans-serif;display:grid;grid-template-columns:60px 1fr 300px;grid-template-rows:52px 1fr;height:100vh;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--head);font-size:12px;}
.ua-tb{grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:0 18px;background:#FFF;border-bottom:1px solid var(--border);box-shadow:0 1px 3px rgba(0,0,0,.08);}
.ua-logo{font-family:var(--head);font-size:15px;font-weight:900;color:#111;letter-spacing:-.6px;}
.ua-logo-sub{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;}
.chip{display:flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:9px;font-weight:600;cursor:pointer;}
.chip-a{background:rgba(153,96,0,.09);border:1px solid rgba(153,96,0,.22);color:#996000;}
.chip-r{background:rgba(225,25,0,.09);border:1px solid rgba(225,25,0,.22);color:#E11900;}
.chip-g{background:rgba(5,148,79,.09);border:1px solid rgba(5,148,79,.22);color:#05944F;}
.ua-tb-r{display:flex;align-items:center;gap:8px;margin-left:auto;}
.live-pill{display:flex;align-items:center;gap:4px;padding:4px 12px;border-radius:20px;background:rgba(5,148,79,.08);border:1px solid rgba(5,148,79,.2);font-size:9px;color:#05944F;font-weight:700;}
.live-dot{width:6px;height:6px;border-radius:50%;background:#05944F;animation:blink 2s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.ua-clock{font-size:11px;color:var(--muted);font-weight:500;}
.ua-nav{display:flex;flex-direction:column;align-items:center;padding:8px 5px;gap:2px;background:#FFF;border-right:1px solid var(--border);overflow-y:auto;scrollbar-width:none;}
.nav-div{width:32px;height:1px;background:var(--border);margin:4px 0;}
.nav-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;width:50px;padding:8px 0;border-radius:10px;cursor:pointer;color:var(--muted);font-size:14px;transition:all .15s;border:none;background:transparent;}
.nav-item:hover{color:#111;background:#F0F0F0;}
.nav-item.active{color:#05944F;background:rgba(5,148,79,.1);}
.nav-label{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;}
.nav-badge{position:absolute;top:3px;right:4px;min-width:14px;height:14px;border-radius:7px;background:var(--red);color:#fff;font-size:8px;display:flex;align-items:center;justify-content:center;font-weight:800;padding:0 3px;border:2px solid #FFF;}
.ua-main{overflow:hidden;display:flex;flex-direction:column;background:var(--bg);}
.pad{padding:16px;overflow-y:auto;height:100%;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.12) transparent;}
.st{font-family:var(--head);font-size:18px;font-weight:800;color:#111;margin-bottom:16px;display:flex;align-items:center;gap:10px;letter-spacing:-.4px;}
.btn{padding:8px 18px;border-radius:50px;font-size:11px;cursor:pointer;border:none;font-family:var(--head);font-weight:700;transition:all .15s;letter-spacing:.1px;line-height:1;}
.btn:hover{opacity:.88;}
.btn:active{transform:scale(.97);}
.btn-p{background:#05944F;color:#FFF;}
.btn-s{background:#FFF;border:1.5px solid rgba(0,0,0,.2);color:#111;}
.btn-s:hover{border-color:rgba(0,0,0,.35);background:#F8F8F8;}
.btn-g{background:rgba(5,148,79,.1);border:1.5px solid rgba(5,148,79,.3);color:#05944F;}
.btn-d{background:rgba(225,25,0,.08);border:1.5px solid rgba(225,25,0,.25);color:#E11900;}
.btn-sm{padding:4px 10px;font-size:9px;}
.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;}
.mc{background:#FFF;border:1px solid var(--border);border-radius:16px;padding:14px 16px;position:relative;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.07);}
.mc::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,currentColor 0,transparent 60%);opacity:.03;}
.mc-l{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:700;margin-bottom:4px;}
.mc-v{font-size:24px;font-weight:800;font-family:var(--head);margin:2px 0;letter-spacing:-.5px;}
.mc-s{font-size:10px;color:var(--muted);}
.kc{background:#FFF;border:1px solid var(--border);border-radius:14px;padding:10px 13px;border-left:3px solid currentColor;box-shadow:0 1px 4px rgba(0,0,0,.07);}
.kc-l{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);font-weight:700;margin-bottom:4px;}
.kc-v{font-size:19px;font-weight:800;font-family:var(--head);letter-spacing:-.3px;}
.kc-s{font-size:10px;color:var(--muted);margin-top:2px;}
.chart-row{display:grid;grid-template-columns:1fr 220px;gap:8px;margin-bottom:10px;}
.chart-card{background:#FFF;border:1px solid var(--border);border-radius:16px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,.07);}
.chart-bars{display:flex;align-items:flex-end;gap:4px;height:70px;}
.bar-w{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;}
.bar{width:100%;border-radius:5px 5px 0 0;background:#05944F;cursor:pointer;transition:opacity .15s;}
.bar:hover{opacity:.8;}
.bar-l{font-size:7px;color:var(--muted);font-weight:600;}
.aw{background:#FFF;border:1px solid var(--border);border-radius:14px;padding:12px;box-shadow:0 1px 4px rgba(0,0,0,.07);}
.aw-title{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;}
.aw-item{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);}
.aw-item:last-child{border-bottom:none;}
.aw-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:3px;}
.aw-txt{font-size:10px;line-height:1.45;}
.feed-card{background:#FFF;border:1px solid var(--border);border-radius:14px;padding:12px;box-shadow:0 1px 4px rgba(0,0,0,.07);}
.fi{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);}
.fi:last-child{border-bottom:none;}
.fi-dot{width:5px;height:5px;border-radius:50%;background:#05944F;flex-shrink:0;margin-top:4px;}
.fi-txt{font-size:10px;flex:1;line-height:1.4;}
.fi-time{font-size:9px;color:var(--muted);}
.map-wrap{position:relative;height:100%;overflow:hidden;}
.map-stats{position:absolute;top:12px;left:12px;z-index:1000;display:flex;gap:6px;}
.map-pill{background:rgba(255,255,255,.94);border:1px solid rgba(0,0,0,.12);border-radius:20px;padding:5px 12px;font-size:10px;display:flex;align-items:center;gap:5px;backdrop-filter:blur(8px);box-shadow:0 1px 4px rgba(0,0,0,.1);font-weight:600;}
.map-leg{position:absolute;bottom:16px;left:12px;z-index:1000;background:rgba(255,255,255,.94);border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:6px 12px;display:flex;gap:14px;font-size:9px;backdrop-filter:blur(8px);box-shadow:0 1px 4px rgba(0,0,0,.1);font-weight:600;}
.leg-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px;}
.map-sb{position:absolute;top:12px;right:12px;z-index:1000;width:215px;max-height:calc(100% - 40px);overflow-y:auto;background:rgba(255,255,255,.96);border:1px solid rgba(0,0,0,.12);border-radius:14px;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,.12);}
.map-sb-h{padding:8px 12px;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);border-bottom:1px solid var(--border);position:sticky;top:0;background:#FFF;font-weight:700;}
.map-pi{padding:8px 12px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s;}
.map-pi:hover{background:#F8F8F8;}
.map-pi:last-child{border-bottom:none;}
.map-pn{font-size:11px;font-weight:700;color:#111;}
.map-ps{font-size:10px;color:var(--muted);margin-top:2px;}
.map-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;}
.al-wrap{padding:16px;overflow-y:auto;height:100%;}
.al-card{background:#FFF;border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;gap:10px;box-shadow:0 1px 4px rgba(0,0,0,.07);}
.al-critical{border-left:4px solid #E11900;}
.al-warning{border-left:4px solid #F59E0B;}
.al-info{border-left:4px solid #7356BF;}
.al-icon{font-size:18px;flex-shrink:0;}
.al-body{flex:1;}
.al-title{font-size:11px;font-weight:700;margin-bottom:3px;color:#111;}
.al-desc{font-size:10px;color:var(--muted);line-height:1.45;}
.al-actions{display:flex;gap:6px;margin-top:8px;}
.tw{background:#FFF;border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.07);}
.th{display:flex;padding:10px 14px;background:#F8F8F8;border-bottom:1.5px solid rgba(0,0,0,.1);font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:700;}
.tr{display:flex;padding:10px 14px;border-bottom:1px solid rgba(0,0,0,.06);align-items:center;transition:background .1s;}
.tr:last-child{border-bottom:none;}
.tr:hover{background:#FAFAFA;}
.tc{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.modal-bd{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);}
.modal-box{background:#FFF;border-radius:20px;padding:24px;width:min(680px,94vw);max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);border:1px solid rgba(0,0,0,.08);}
.modal-title{font-size:16px;font-weight:800;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;color:#111;letter-spacing:-.3px;}
.mclose{background:rgba(0,0,0,.07);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.mclose:hover{background:rgba(0,0,0,.14);}
.modal-acts{display:flex;gap:8px;margin-top:18px;padding-top:16px;border-top:1px solid var(--border);}
.modal-pdf{width:100%;height:300px;border:1px solid var(--border);border-radius:10px;}
.modal-preview{width:100%;border-radius:10px;border:1px solid var(--border);}
.fgroup{margin-bottom:14px;}
.flabel{display:block;font-size:11px;font-weight:700;color:rgba(0,0,0,.6);margin-bottom:5px;letter-spacing:.1px;}
.finput{background:#F8F9FA;border:2px solid rgba(0,0,0,.18);border-radius:10px;padding:10px 13px;color:#111;font-family:var(--head);font-size:12px;outline:none;width:100%;transition:border-color .2s,box-shadow .2s,background .2s;}
.finput:hover{border-color:rgba(0,0,0,.3);background:#FFF;}
.finput:focus{border-color:#05944F;box-shadow:0 0 0 3px rgba(5,148,79,.12);background:#FFF;}
.finput::placeholder{color:rgba(0,0,0,.28);}
.ftextarea{background:#F8F9FA;border:2px solid rgba(0,0,0,.18);border-radius:10px;padding:10px 13px;color:#111;font-family:var(--head);font-size:12px;outline:none;width:100%;resize:vertical;min-height:80px;transition:border-color .2s,box-shadow .2s,background .2s;}
.ftextarea:hover{border-color:rgba(0,0,0,.3);background:#FFF;}
.ftextarea:focus{border-color:#05944F;box-shadow:0 0 0 3px rgba(5,148,79,.12);background:#FFF;}
.fselect{background:#F8F9FA;border:2px solid rgba(0,0,0,.18);border-radius:10px;padding:10px 13px;color:#111;font-family:var(--head);font-size:12px;outline:none;width:100%;cursor:pointer;appearance:none;transition:border-color .2s;}
.fselect:focus{border-color:#05944F;box-shadow:0 0 0 3px rgba(5,148,79,.12);background:#FFF;}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.fg.full{grid-column:1/-1;}
.pill-g{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;background:rgba(5,148,79,.09);color:#05944F;border:1px solid rgba(5,148,79,.2);}
.pill-r{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;background:rgba(225,25,0,.08);color:#E11900;border:1px solid rgba(225,25,0,.2);}
.pill-a{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;background:rgba(153,96,0,.08);color:#996000;border:1px solid rgba(153,96,0,.2);}
.pill-c{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;background:rgba(39,110,241,.08);color:#276EF1;border:1px solid rgba(39,110,241,.2);}
.pill-m{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;background:rgba(0,0,0,.06);color:#444;border:1px solid rgba(0,0,0,.12);}
.config-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border);transition:background .1s;}
.config-row:hover{background:#FAFAFA;}
.config-row:last-child{border-bottom:none;}
.config-key{flex:1;font-size:11px;font-weight:700;color:#111;}
.config-desc{flex:2;font-size:10px;color:var(--muted);}
.config-val{flex:1;display:flex;align-items:center;gap:6px;}
.config-input{background:#F8F9FA;border:2px solid rgba(0,0,0,.18);border-radius:8px;padding:7px 10px;color:#111;font-family:var(--head);font-size:11px;outline:none;width:110px;transition:border-color .2s,box-shadow .2s;}
.config-input:hover{border-color:rgba(0,0,0,.3);}
.config-input:focus{border-color:#05944F;box-shadow:0 0 0 2px rgba(5,148,79,.1);}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;}
.cat-card{background:#FFF;border:1px solid var(--border);border-radius:16px;padding:14px;text-align:center;cursor:pointer;transition:all .15s;box-shadow:0 1px 4px rgba(0,0,0,.07);}
.cat-card:hover{border-color:#05944F;box-shadow:0 4px 16px rgba(5,148,79,.12);}
.cat-emoji{font-size:28px;margin-bottom:6px;}
.cat-name{font-size:11px;font-weight:700;color:#111;}
.cat-slug{font-size:9px;color:var(--muted);margin-top:2px;}
.cat-actions{display:flex;justify-content:center;gap:6px;margin-top:10px;}
.cat-inactive{opacity:.4;}
.notif-compose{background:#FFF;border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.07);}
.report-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
.report-card{background:#FFF;border:1px solid var(--border);border-radius:16px;padding:16px;cursor:pointer;transition:all .15s;box-shadow:0 1px 4px rgba(0,0,0,.07);}
.report-card:hover{border-color:#05944F;box-shadow:0 4px 16px rgba(5,148,79,.1);}
.report-icon{font-size:24px;margin-bottom:8px;}
.report-title{font-size:12px;font-weight:700;margin-bottom:4px;color:#111;}
.report-desc{font-size:10px;color:var(--muted);margin-bottom:12px;line-height:1.5;}
.tarifa-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr 90px;gap:0;}
.tarifa-head{background:#F8F8F8;border-bottom:1.5px solid var(--border);}
.tarifa-th{padding:8px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);font-weight:700;}
.tarifa-row{display:contents;}
.tarifa-td{padding:9px 10px;border-bottom:1px solid rgba(0,0,0,.06);font-size:11px;display:flex;align-items:center;}
.tinput{background:#F8F9FA;border:1.5px solid rgba(0,0,0,.18);border-radius:7px;color:#111;font-family:var(--head);font-size:11px;outline:none;width:80px;padding:5px 8px;transition:border-color .2s;}
.tinput:hover{border-color:rgba(0,0,0,.3);}
.tinput:focus{border-color:#05944F;box-shadow:0 0 0 2px rgba(5,148,79,.1);}
.ua-hugo{background:#FFF;border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;}
.hugo-hd{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;background:#FAFAFA;}
.hugo-orb{width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#08e876,#05944F 50%,#013d22);box-shadow:0 0 10px rgba(5,148,79,.35);animation:pulse 3s ease-in-out infinite;flex-shrink:0;}
@keyframes pulse{0%,100%{box-shadow:0 0 10px rgba(5,148,79,.3)}50%{box-shadow:0 0 20px rgba(5,148,79,.55)}}
.hugo-name{font-family:var(--head);font-size:13px;color:#05944F;font-weight:800;}
.hugo-mode{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;margin-top:1px;}
.hugo-msgs{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:7px;scrollbar-width:thin;}
.hm{max-width:96%;padding:9px 12px;border-radius:10px;font-size:11px;line-height:1.55;}
.hm-hugo{background:rgba(5,148,79,.06);border:1px solid rgba(5,148,79,.15);color:#111;border-radius:10px 10px 10px 3px;}
.hm-admin{background:#111;color:#FFF;align-self:flex-end;border-radius:10px 10px 3px 10px;}
.hm-time{font-size:8px;color:var(--muted);margin-top:3px;}
.htyping{display:flex;gap:4px;align-items:center;padding:9px 12px;}
.ht{width:5px;height:5px;border-radius:50%;background:rgba(0,0,0,.2);}
.ht:nth-child(1){animation:td .9s ease-in-out infinite}
.ht:nth-child(2){animation:td .9s ease-in-out .2s infinite}
.ht:nth-child(3){animation:td .9s ease-in-out .4s infinite}
@keyframes td{0%,60%,100%{opacity:.3;transform:scale(1)}30%{opacity:1;transform:scale(1.25)}}
.hugo-act{margin:6px 10px;background:rgba(153,96,0,.05);border:1.5px solid rgba(153,96,0,.2);border-radius:10px;padding:10px;}
.ha-lbl{font-size:8px;color:#996000;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px;}
.ha-desc{font-size:11px;margin-bottom:8px;line-height:1.5;}
.ha-btns{display:flex;gap:6px;}
.ha-yes{padding:5px 13px;border-radius:20px;font-size:10px;cursor:pointer;border:none;background:#05944F;color:#FFF;font-weight:700;font-family:var(--head);}
.ha-no{padding:5px 11px;border-radius:20px;font-size:10px;cursor:pointer;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-family:var(--head);}
.hugo-inp-row{display:flex;gap:6px;padding:10px;border-top:1px solid var(--border);background:#FAFAFA;}
.hugo-in{flex:1;background:#FFF;border:2px solid rgba(0,0,0,.18);border-radius:20px;padding:7px 12px;color:#111;font-family:var(--head);font-size:11px;outline:none;transition:border-color .2s;}
.hugo-in:hover{border-color:rgba(0,0,0,.3);}
.hugo-in:focus{border-color:#05944F;box-shadow:0 0 0 2px rgba(5,148,79,.1);}
.hugo-send{padding:7px 13px;border-radius:20px;border:none;background:#05944F;color:#FFF;font-weight:700;cursor:pointer;font-family:var(--head);font-size:11px;}
.leaflet-popup-content-wrapper{background:#FFF!important;border:1px solid rgba(0,0,0,.15)!important;border-radius:12px!important;box-shadow:0 4px 20px rgba(0,0,0,.15)!important;}
.leaflet-popup-tip{background:#FFF!important;}
.leaflet-popup-content{margin:10px 13px!important;color:#111!important;font-family:'Inter',sans-serif!important;font-size:11px!important;}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@media(max-width:1100px){.ua{grid-template-columns:60px 1fr;}.ua-hugo{display:none;}.kpi-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:720px){.ua{grid-template-columns:1fr;grid-template-rows:52px 1fr 60px;}.ua-nav{grid-row:3;grid-column:1;flex-direction:row;justify-content:space-around;border-right:none;border-top:1px solid var(--border);padding:4px 2px;overflow-x:auto;gap:0;background:#FFF;}.ua-tb{grid-row:1;grid-column:1;}.ua-main{grid-row:2;grid-column:1;}.nav-item{width:auto;min-width:48px;padding:5px 6px;border-radius:10px;}.nav-label{display:block;font-size:7px;}.nav-div{display:none;}.metric-grid{grid-template-columns:repeat(2,1fr);}.kpi-grid{grid-template-columns:repeat(2,1fr);}.chart-row{grid-template-columns:1fr;}.pad{padding:12px;}.tw{overflow-x:auto;}.th,.tr{min-width:520px;}.fgrid{grid-template-columns:1fr;}.fg.full{grid-column:1;}.modal-box{padding:18px;border-radius:16px;}.map-sb{width:170px;}.st{font-size:16px;}.cat-grid{grid-template-columns:repeat(2,1fr);}.report-grid{grid-template-columns:1fr;}}
@media(max-width:400px){.metric-grid{grid-template-columns:1fr;}.kpi-grid{grid-template-columns:1fr;}}
`;

const fmt = (n: any, p = '') => n == null ? '—' : `${p}${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n: any) => n == null ? '—' : Number(n).toLocaleString('pt-BR');
const timeAgo = (d: string) => { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return 'ahora'; if (s < 3600) return `${Math.floor(s/60)}m`; if (s < 86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const sc = (s: string) => ({ ejecutando:'g', en_camino:'a', negociando:'c', confirmado:'c', completado:'m', cancelado:'r', disputa:'r' }[s] || 'm');
const alertIcon = (t: string) => ({ karma_bajo:'⚠️', disputa_antigua:'🚨', escrow_pendiente:'💰', proveedor_inactivo:'😴' }[t] || '⚡');
const alertTitle = (t: string) => ({ karma_bajo:'Karma bajo', disputa_antigua:'Disputa sin resolver', escrow_pendiente:'Escrow pendiente', proveedor_inactivo:'Proveedor inactivo' }[t] || t);

function downloadCSV(data: any[], filename: string) {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function AdminPanel() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('sebastianzoth@gmail.com');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');

  useEffect(() => {
    (supabase as any).auth.getSession().then(({ data }: any) => {
      setSession(data.session); setAuthLoading(false);
      if (data.session) resetRealtimeChannel();
    });
    const { data: { subscription } } = (supabase as any).auth.onAuthStateChange((_: any, s: any) => {
      if (s && s.user?.email?.toLowerCase() !== 'sebastianzoth@gmail.com') {
        (supabase as any).auth.signOut();
        return;
      }
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const ADMIN_EMAIL = 'sebastianzoth@gmail.com';

  const addToast = useCallback((msg: string, color = '#05944F') => {
    const id = Date.now();
    setRtToasts(p => [...p.slice(-3), { id, msg, color }]);
    setTimeout(() => setRtToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  // Realtime live events → toasts
  useEffect(() => {
    if (!session) return;
    resetRealtimeChannel();
    const unsub = onRealtimeEvent(({ table, type, row }) => {
      if (table === 'servicios' && type === 'INSERT') addToast(`⚡ Nuevo servicio creado — ${row.zona || 'Sin zona'}`, '#276EF1');
      if (table === 'servicios' && type === 'UPDATE' && row.estado === 'completado') addToast(`✅ Servicio completado — R$${row.tarifa || '—'}`, '#05944F');
      if (table === 'disputas' && type === 'INSERT') addToast(`⚠ Nueva disputa abierta`, '#996000');
      if (table === 'usuarios' && type === 'UPDATE' && row.online === true) addToast(`🟢 Proveedor online: ${row.nombre || '—'}`, '#05944F');
      if (table === 'documentos' && type === 'INSERT') addToast(`📄 Nuevo documento pendiente`, '#7356BF');
    });
    return () => { unsub(); };
  }, [session, addToast]);

  const doLogin = async () => {
    setLoginErr('');
    if (loginEmail.trim().toLowerCase() !== ADMIN_EMAIL) {
      setLoginErr('Acceso denegado. Solo el administrador puede ingresar.');
      return;
    }
    const { error } = await (supabase as any).auth.signInWithPassword({ email: loginEmail, password: loginPass });
    if (error) setLoginErr(error.message === 'Invalid login credentials' ? 'Contraseña incorrecta' : error.message);
  };

  const [section, setSection] = useState<Section>('dashboard');
  const [clock, setClock] = useState('');
  const [usrTab, setUsrTab] = useState<'perfiles'|'auth'>('perfiles');
  const [usrFilter, setUsrFilter] = useState<'all'|'proveedor'|'cliente'>('all');
  const [authEnabled, setAuthEnabled] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Modal state
  const [modal, setModal] = useState<{type: ModalType; data?: any}>({ type: null });
  const closeModal = useCallback(() => setModal({ type: null }), []);

  // Doc preview
  const [previewUrl, setPreviewUrl] = useState<string|null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [docNotes, setDocNotes] = useState('');

  // Forms
  const [catForm, setCatForm] = useState({ nombre:'', emoji:'🔧' });
  const [userForm, setUserForm] = useState({ email:'', nombre:'', apellido:'', tipo:'cliente', telefono:'', zona:'', pais:'BR' });
  const [servForm, setServForm] = useState({ cliente_id:'', proveedor_id:'', categoria_id:'', descripcion:'', zona:'', tarifa:'' });
  const [disputeRes, setDisputeRes] = useState('');
  const [disputeFavor, setDisputeFavor] = useState<'cliente'|'proveedor'>('cliente');
  const [notifForm, setNotifForm] = useState({ titulo:'', cuerpo:'', target:'todos', zona:'' });
  const [notifResult, setNotifResult] = useState<any>(null);
  const [editingConfig, setEditingConfig] = useState<Record<string, string>>({});
  const [editingTarifa, setEditingTarifa] = useState<any>(null);
  const [contactModal, setContactModal] = useState<any>(null);
  const [rtToasts, setRtToasts] = useState<{id:number;msg:string;color:string}[]>([]);
  const [contactMsg, setContactMsg] = useState({ titulo:'', cuerpo:'' });
  const [contactSent, setContactSent] = useState(false);

  // Hugo
  const [chat, setChat] = useState<{role:'hugo'|'admin'; text:string; action?:string; ts:Date}[]>([
    { role:'hugo', text:'Sistema U.GO activo. ¿Qué necesitás?', ts: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [hugoLoading, setHugoLoading] = useState(false);
  const [pendingAct, setPendingAct] = useState<string|null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Data hooks
  const { metrics } = useDashboardMetrics();
  const kpis = useConversionKPIs();
  const { alerts, criticalCount, warningCount } = useSystemAlerts();
  const { providers: mapProviders } = useMapProviders();
  const { services, refetch: refetchServices } = useActiveServices();
  const { disputes, resolverDisputa } = useOpenDisputes();
  const { docs, updateEstado, getSignedUrl } = usePendingDocuments();
  const feed = useActivityFeed();
  const weekData = useWeekMetrics();
  const { users, suspenderProveedor, reactivarProveedor, crearUsuario, updateUsuario } = useUsuarios();
  const { users: authUsers, loading: authUsersLoading } = useAuthUsers(authEnabled);
  const { categorias, crear: crearCat, actualizar: actualizarCat, toggleActiva } = useCategorias();
  const { tarifas, upsert: upsertTarifa } = useTarifas();
  const { config, update: updateConfig } = useConfigSistema();
  const { hist: notifHist, enviar: enviarNotif } = useNotificaciones();
  const { crear: crearServicio, cancelar: cancelarServicio } = useServiciosCRUD();
  const { exportServicios, exportUsuarios } = useExport();
  const { escrows, liberarEscrow } = useVault();
  const withdrawals = usePendingWithdrawals();

  // Clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })), 1000);
    return () => clearInterval(t);
  }, []);

  // Leaflet
  useEffect(() => {
    if ((window as any).L) { setLeafletReady(true); return; }
    const link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
    const script = document.createElement('script'); script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload=()=>setLeafletReady(true); document.body.appendChild(script);
  }, []);
  useEffect(() => { if (!leafletReady || !mapDivRef.current || mapRef.current) return; const L=(window as any).L; mapRef.current=L.map(mapDivRef.current,{center:[-27.5954,-48.5480],zoom:13,zoomControl:false}); L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'© CARTO',maxZoom:19}).addTo(mapRef.current); L.control.zoom({position:'bottomright'}).addTo(mapRef.current); }, [leafletReady]);
  useEffect(() => { if (section==='mapa' && mapRef.current) setTimeout(()=>mapRef.current?.invalidateSize(), 60); }, [section]);
  useEffect(() => {
    if (!mapRef.current || !leafletReady) return; const L=(window as any).L;
    markersRef.current.forEach(m=>m.remove()); markersRef.current=[];
    mapProviders.forEach(p=>{ if(!p.lat||!p.lng) return; const color=p.disponible?'#00e57a':'#f59e0b'; const icon=L.divIcon({html:`<div style="width:11px;height:11px;border-radius:50%;background:${color};border:2px solid #070a0d;box-shadow:0 0 7px ${color}88;"></div>`,className:'',iconSize:[11,11],iconAnchor:[5,5]}); const m=L.marker([p.lat,p.lng],{icon}).addTo(mapRef.current).bindPopup(`<div style="font-family:'Space Mono',monospace;"><div style="color:#00f2ff;font-weight:700;margin-bottom:3px;">${p.nombre} ${p.apellido||''}</div><div>⭐ ${p.karma} · ${p.servicios_completados} servicios</div><div style="margin-top:2px;">${p.disponible?'🟢 Disponible':`🟡 ${p.categoria_nombre||'En trabajo'}`}</div>${p.zona?`<div style="color:#888;font-size:10px;margin-top:2px;">${p.zona}</div>`:''}</div>`); markersRef.current.push(m); });
  }, [mapProviders, leafletReady]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [chat, hugoLoading]);
  useEffect(() => { if (usrTab==='auth') setAuthEnabled(true); }, [usrTab]);

  const maxRev = useMemo(() => Math.max(1, ...weekData.map(d => Number(d.ingresos_brutos)||0)), [weekData]);
  const provDisp = mapProviders.filter(p=>p.disponible).length;
  const filtUsers = useMemo(() => users.filter(u=>usrFilter==='all'||u.tipo===usrFilter), [users, usrFilter]);

  const sendHugo = useCallback(async (text: string) => {
    if (!text.trim()||hugoLoading) return; setInput('');
    setChat(c=>[...c,{role:'admin',text,ts:new Date()}]); setHugoLoading(true);
    const ctx = metrics ? `Servicios activos:${metrics.servicios_activos} Bóveda:R$${metrics.boveda_total} Proveedores:${metrics.proveedores_online}/${metrics.proveedores_total} Disputas:${metrics.disputas_abiertas} Ingresos hoy:R$${metrics.ingresos_hoy} Alertas críticas:${criticalCount}` : '';
    const history = chat.slice(-8).map(m=>({role:m.role==='admin'?'user':'assistant',content:m.text}));
    try {
      const res = await fetch('/api/hugo/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'admin',message:text,context:ctx,history})});
      const data = await res.json();
      const msg = data.hugo_mensaje||data.message||'Error al procesar.';
      const am = msg.match(/\[ACCION:\s*([^\]]+)\]/i);
      if (am) setPendingAct(am[1].trim());
      setChat(c=>[...c,{role:'hugo',text:msg.replace(/\[ACCION:[^\]]+\]/gi,'').trim(),ts:new Date()}]);
    } catch { setChat(c=>[...c,{role:'hugo',text:'Error de conexión.',ts:new Date()}]); }
    finally { setHugoLoading(false); }
  }, [chat, hugoLoading, metrics, criticalCount]);

  const openDocPreview = useCallback(async (doc: any) => {
    setModal({type:'doc-preview',data:doc}); setDocNotes(doc.notas||''); setPreviewUrl(null);
    if (doc.url_storage) { setPreviewLoading(true); const url=await getSignedUrl(doc.url_storage); setPreviewUrl(url); setPreviewLoading(false); }
  }, [getSignedUrl]);

  // ──────────────────────────────────────────────────────────
  // SECTIONS
  // ──────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="pad">
      <div className="st">Dashboard</div>
      <div className="metric-grid">
        {[
          {l:'Servicios activos',v:fmtN(metrics?.servicios_activos),s:'en tiempo real',c:'var(--cyan)'},
          {l:'Bóveda',v:fmt(metrics?.boveda_total,'R$'),s:'fondos retenidos',c:'var(--green)'},
          {l:'Proveedores online',v:`${fmtN(metrics?.proveedores_online)}/${fmtN(metrics?.proveedores_total)}`,s:'disponibles ahora',c:'var(--amber)'},
          {l:'Disputas abiertas',v:fmtN(metrics?.disputas_abiertas),s:fmt(metrics?.monto_disputado,'R$')+' retenidos',c:'var(--red)'},
          {l:'Ingresos hoy',v:fmt(metrics?.ingresos_hoy,'R$'),s:fmt(metrics?.ingresos_mes,'R$')+' este mes',c:'var(--green)'},
          {l:'Docs pendientes',v:fmtN(metrics?.docs_pendientes),s:'por revisar',c:'var(--purple)'},
        ].map(m=>(
          <div key={m.l} className="mc" style={{color:m.c}}>
            <div className="mc-l">{m.l}</div>
            <div className="mc-v" style={{color:m.c}}>{m.v}</div>
            <div className="mc-s">{m.s}</div>
          </div>
        ))}
      </div>
      <div className="kpi-grid">
        <div className="kc" style={{color:'var(--green)'}}><div className="kc-l">Conversión 30d</div><div className="kc-v" style={{color:'var(--green)'}}>{kpis?.tasa_conversion_pct??'—'}%</div><div className="kc-s">{fmtN(kpis?.confirmados)} confirmados</div></div>
        <div className="kc" style={{color:'var(--cyan)'}}><div className="kc-l">Tiempo respuesta</div><div className="kc-v" style={{color:'var(--cyan)'}}>{kpis?.tiempo_respuesta_prom_min??'—'} min</div><div className="kc-s">solicitud→confirmación</div></div>
        <div className="kc" style={{color:'var(--red)'}}><div className="kc-l">Tasa abandono</div><div className="kc-v" style={{color:'var(--red)'}}>{kpis?.tasa_abandono_pct??'—'}%</div><div className="kc-s">{fmtN(kpis?.cancelados)} cancelados</div></div>
        <div className="kc" style={{color:'var(--amber)'}}><div className="kc-l">Ticket promedio</div><div className="kc-v" style={{color:'var(--amber)'}}>{fmt(kpis?.ticket_prom,'R$')}</div><div className="kc-s">comisión: {fmt(kpis?.comision_total,'R$')}</div></div>
      </div>
      <div className="chart-row">
        <div className="chart-card">
          <div style={{fontSize:9,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:'1px'}}>Ingresos 7 días</div>
          <div className="chart-bars">
            {weekData.map(d=>{const h=Math.max(4,Math.round((Number(d.ingresos_brutos)/maxRev)*70)); const dia=new Date(d.fecha+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'}); return (<div key={d.fecha} className="bar-w"><div className="bar" style={{height:h}} title={`R$ ${d.ingresos_brutos}`}/><div className="bar-l">{dia}</div></div>);})}
          </div>
        </div>
        <div className="aw">
          <div className="aw-title"><span>⚡ Alertas</span>{(criticalCount+warningCount)>0&&<span style={{color:'var(--red)',cursor:'pointer'}} onClick={()=>setSection('alertas')}>{criticalCount+warningCount} →</span>}</div>
          {alerts.length===0?<div style={{padding:'12px 0',textAlign:'center',color:'var(--green)',fontSize:10}}>✅ Sin alertas</div>:alerts.slice(0,4).map((a,i)=>(
            <div key={i} className="aw-item"><div className="aw-dot" style={{background:a.severidad==='critical'?'var(--red)':a.severidad==='warning'?'var(--amber)':'var(--purple)'}}/><div className="aw-txt">{a.descripcion}</div></div>
          ))}
        </div>
      </div>
      <div className="feed-card">
        <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:7}}>Actividad reciente</div>
        {feed.slice(0,10).map(e=>(
          <div key={e.id} className="fi"><div className="fi-dot"/><div className="fi-txt"><span style={{color:'var(--cyan)'}}>{e.evento.replace(/_/g,' ')}</span>{e.detalles?.zona&&<span style={{color:'var(--muted)'}}> · {e.detalles.zona}</span>}{e.detalles?.monto&&<span style={{color:'var(--green)'}}> · R${e.detalles.monto}</span>}</div><div className="fi-time">{timeAgo(e.created_at)}</div></div>
        ))}
      </div>
    </div>
  );

  const renderAlertas = () => (
    <div className="al-wrap">
      <div className="st">Alertas del sistema<span style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--muted)'}}>{criticalCount} críticas · {warningCount} advertencias</span></div>
      {alerts.length===0?<div style={{textAlign:'center',padding:'40px',color:'var(--green)',fontSize:12}}>✅ Sin alertas activas</div>:alerts.map((a,i)=>(
        <div key={i} className={`al-card al-${a.severidad}`}><div className="al-icon">{alertIcon(a.tipo)}</div><div className="al-body"><div className="al-title">{alertTitle(a.tipo)}</div><div className="al-desc">{a.descripcion}</div><div className="al-acts">
          <button className="btn btn-p btn-sm" onClick={()=>sendHugo(`Analiza: ${a.descripcion}`)}>Consultar Hugo</button>
          {a.tipo==='disputa_antigua'&&<button className="btn btn-s btn-sm" onClick={()=>setSection('disputas')}>Ver disputa</button>}
          {a.tipo==='escrow_pendiente'&&<button className="btn btn-s btn-sm" onClick={()=>setSection('finanzas')}>Ver escrow</button>}
          {a.tipo==='karma_bajo'&&<button className="btn btn-d btn-sm" onClick={()=>sendHugo(`Suspender proveedor: ${a.descripcion}`)}>Suspender</button>}
        </div></div></div>
      ))}
    </div>
  );

  const renderServicios = () => (
    <div className="pad">
      <div className="st">Servicios<button className="btn btn-p btn-sm" style={{marginLeft:'auto'}} onClick={()=>setModal({type:'servicio-form'})}>+ Crear servicio</button></div>
      <div className="tw">
        <div className="th"><div className="tc" style={{flex:2}}>Categoría</div><div className="tc" style={{flex:1.5}}>Cliente</div><div className="tc" style={{flex:1.5}}>Proveedor</div><div className="tc" style={{flex:1}}>Estado</div><div className="tc" style={{flex:1}}>Tarifa</div><div className="tc" style={{flex:1}}>Hace</div><div className="tc" style={{flex:1}}>Acciones</div></div>
        {services.map(s=>(
          <div key={s.id} className="tr">
            <div className="tc" style={{flex:2}}>{(s as any).categorias?.emoji} {(s as any).categorias?.nombre||'—'}<div style={{fontSize:9,color:'var(--muted)'}}>{s.zona}</div></div>
            <div className="tc" style={{flex:1.5}}>{(s as any).clientes?.nombre||'—'}</div>
            <div className="tc" style={{flex:1.5}}>{(s as any).proveedores?.nombre||'—'}</div>
            <div className="tc" style={{flex:1}}><span className={`pill pill-${sc(s.estado)}`}>{s.estado}</span></div>
            <div className="tc" style={{flex:1,color:'var(--green)'}}>{s.tarifa?`R$${s.tarifa}`:'—'}</div>
            <div className="tc" style={{flex:1,color:'var(--muted)'}}>{timeAgo(s.created_at!)}</div>
            <div className="tc" style={{flex:1,display:'flex',gap:3}}>
              {!['completado','cancelado'].includes(s.estado)&&<button className="btn btn-d btn-sm" onClick={async()=>{await cancelarServicio(s.id,'Admin'); refetchServices();}}>✕</button>}
            </div>
          </div>
        ))}
        {services.length===0&&<div style={{padding:'20px',textAlign:'center',color:'var(--muted)',fontSize:10}}>Sin servicios activos</div>}
      </div>
    </div>
  );

  const renderDisputas = () => (
    <div className="pad">
      <div className="st">Disputas abiertas</div>
      {disputes.map(d=>(
        <div key={d.id} className="al-card al-critical" style={{marginBottom:7}}><div className="al-icon">⚖️</div><div className="al-body">
          <div className="al-title">{d.numero} — {fmt(d.monto_disputado,'R$')}</div>
          <div className="al-desc">{(d as any).clientes?.nombre} vs {(d as any).proveedores?.nombre} · {d.motivo}</div>
          <div style={{marginTop:4}}><span className={`pill pill-${d.estado==='abierta'?'r':'a'}`}>{d.estado}</span><span style={{color:'var(--muted)',fontSize:9,marginLeft:7}}>Hace {timeAgo(d.created_at!)}</span></div>
          <div className="al-acts">
            <button className="btn btn-p btn-sm" onClick={()=>{setModal({type:'disputa',data:d});setDisputeRes('');setDisputeFavor('cliente');}}>Resolver</button>
            <button className="btn btn-s btn-sm" onClick={()=>sendHugo(`Analiza disputa ${d.numero}: ${d.motivo}. Monto: R$${d.monto_disputado}`)}>Consultar Hugo</button>
          </div>
        </div></div>
      ))}
      {disputes.length===0&&<div style={{textAlign:'center',padding:'40px',color:'var(--green)',fontSize:12}}>✅ Sin disputas abiertas</div>}
    </div>
  );

  const renderUsuarios = () => (
    <div className="pad">
      <div className="st">Usuarios<button className="btn btn-p btn-sm" style={{marginLeft:'auto'}} onClick={()=>{setUserForm({email:'',nombre:'',apellido:'',tipo:'cliente',telefono:'',zona:'',pais:'BR'});setModal({type:'user-form'});}}>+ Crear usuario</button></div>
      <div className="tab-row">
        {(['perfiles','auth'] as const).map(t=><button key={t} className={`tab-btn${usrTab===t?' active':''}`} onClick={()=>setUsrTab(t)}>{t==='perfiles'?`Perfiles (${users.length})`:`Auth Users${authUsers.length?` (${authUsers.length})`:''}`}</button>)}
        {usrTab==='perfiles'&&<div style={{marginLeft:'auto',display:'flex',gap:3}}>{(['all','proveedor','cliente'] as const).map(f=><button key={f} className={`tab-btn${usrFilter===f?' active':''}`} onClick={()=>setUsrFilter(f)}>{f==='all'?'Todos':f}</button>)}</div>}
      </div>
      {usrTab==='perfiles'?(
        <div className="tw">
          <div className="th"><div className="tc" style={{flex:2}}>Nombre</div><div className="tc" style={{flex:2}}>Email</div><div className="tc" style={{flex:1}}>Tipo</div><div className="tc" style={{flex:1}}>Karma</div><div className="tc" style={{flex:0.8}}>Estado</div><div className="tc" style={{flex:1.5}}>Acciones</div></div>
          {filtUsers.map(u=>(
            <div key={u.id} className="tr">
              <div className="tc" style={{flex:2}}>{u.nombre} {u.apellido||''}{u.online&&<span style={{color:'var(--green)',marginLeft:4,fontSize:8}}>●</span>}</div>
              <div className="tc" style={{flex:2,color:'var(--muted)'}}>{u.email}</div>
              <div className="tc" style={{flex:1}}><span className={`pill pill-${u.tipo==='admin'?'c':u.tipo==='proveedor'?'a':'m'}`}>{u.tipo}</span></div>
              <div className="tc" style={{flex:1,color:Number(u.karma)<4?'var(--red)':'var(--text)'}}>{u.karma}⭐</div>
              <div className="tc" style={{flex:0.8}}><span className={`pill pill-${u.activo?'g':'r'}`}>{u.activo?'activo':'inactivo'}</span></div>
              <div className="tc" style={{flex:1.5,display:'flex',gap:3}}>
                <button className="btn btn-s btn-sm" onClick={()=>{setUserForm({email:u.email,nombre:u.nombre,apellido:u.apellido||'',tipo:u.tipo,telefono:u.telefono||'',zona:u.zona||'',pais:u.pais||'BR'});setModal({type:'user-edit',data:u});}}>Editar</button>
                {u.tipo==='proveedor'&&<button className="btn btn-p btn-sm" onClick={()=>{setContactModal(u);setContactMsg({titulo:'',cuerpo:''});setContactSent(false);}}>📨</button>}
                {u.tipo==='proveedor'&&u.activo&&<button className="btn btn-d btn-sm" onClick={()=>suspenderProveedor(u.id,'Suspensión manual')}>Susp.</button>}
                {u.tipo==='proveedor'&&!u.activo&&<button className="btn btn-g btn-sm" onClick={()=>reactivarProveedor(u.id)}>Reactiv.</button>}
              </div>
            </div>
          ))}
        </div>
      ):(
        <div className="tw">
          <div className="th"><div className="tc" style={{flex:2.5}}>Email</div><div className="tc" style={{flex:1.5}}>Nombre perfil</div><div className="tc" style={{flex:1}}>Tipo</div><div className="tc" style={{flex:1}}>Confirmado</div><div className="tc" style={{flex:1}}>Perfil</div><div className="tc" style={{flex:1}}>Último login</div></div>
          {authLoading?<div style={{padding:'20px',textAlign:'center',color:'var(--muted)'}}>Cargando...</div>:authUsers.map((u,i)=>(
            <div key={i} className="tr">
              <div className="tc" style={{flex:2.5}}>{u.email}</div>
              <div className="tc" style={{flex:1.5,color:'var(--muted)'}}>{u.usuario_nombre?.trim()||'—'}</div>
              <div className="tc" style={{flex:1}}>{u.usuario_tipo?<span className={`pill pill-${u.usuario_tipo==='proveedor'?'a':'m'}`}>{u.usuario_tipo}</span>:<span className="pill pill-m">sin perfil</span>}</div>
              <div className="tc" style={{flex:1}}><span className={`pill pill-${u.email_confirmed?'g':'r'}`}>{u.email_confirmed?'sí':'no'}</span></div>
              <div className="tc" style={{flex:1}}><span className={`pill pill-${u.has_profile?'g':'a'}`}>{u.has_profile?'completo':'pendiente'}</span></div>
              <div className="tc" style={{flex:1,color:'var(--muted)'}}>{u.last_sign_in_at?timeAgo(u.last_sign_in_at):'nunca'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDocumentos = () => (
    <div className="pad">
      <div className="st">Verificación de documentos</div>
      <div className="tw">
        <div className="th"><div className="tc" style={{flex:2}}>Proveedor</div><div className="tc" style={{flex:1.5}}>Documento</div><div className="tc" style={{flex:1}}>Estado</div><div className="tc" style={{flex:1}}>OCR</div><div className="tc" style={{flex:0.8}}>Hace</div><div className="tc" style={{flex:1.5}}>Acciones</div></div>
        {docs.map(d=>(
          <div key={d.id} className="tr">
            <div className="tc" style={{flex:2}}>{(d as any).usuarios?.nombre} {(d as any).usuarios?.apellido||''}<div style={{fontSize:9,color:'var(--muted)'}}>{(d as any).usuarios?.email}</div></div>
            <div className="tc" style={{flex:1.5}}>{d.tipo.toUpperCase()}</div>
            <div className="tc" style={{flex:1}}><span className={`pill pill-${d.estado==='pendiente'?'a':'c'}`}>{d.estado}</span></div>
            <div className="tc" style={{flex:1}}>{d.ocr_valido===true?<span style={{color:'var(--green)'}}>✓</span>:d.ocr_valido===false?<span style={{color:'var(--red)'}}>✗</span>:'—'}</div>
            <div className="tc" style={{flex:0.8,color:'var(--muted)'}}>{timeAgo(d.created_at!)}</div>
            <div className="tc" style={{flex:1.5,display:'flex',gap:3}}>
              <button className="btn btn-s btn-sm" onClick={()=>openDocPreview(d)}>Ver</button>
              <button className="btn btn-p btn-sm" onClick={()=>updateEstado(d.id,'aprobado')}>✓</button>
              <button className="btn btn-d btn-sm" onClick={()=>updateEstado(d.id,'rechazado')}>✗</button>
            </div>
          </div>
        ))}
        {docs.length===0&&<div style={{padding:'20px',textAlign:'center',color:'var(--muted)',fontSize:10}}>Sin documentos pendientes</div>}
      </div>
    </div>
  );

  const renderCategorias = () => (
    <div className="pad">
      <div className="st">Categorías<button className="btn btn-p btn-sm" style={{marginLeft:'auto'}} onClick={()=>{setCatForm({nombre:'',emoji:'🔧'});setModal({type:'cat-form'});}}>+ Nueva</button></div>
      <div className="cat-grid">
        {categorias.map(c=>(
          <div key={c.id} className={`cat-card${!c.activa?' cat-inactive':''}`}>
            <div className="cat-emoji">{c.emoji}</div>
            <div className="cat-name">{c.nombre}</div>
            <div className="cat-slug">{c.slug}</div>
            <div className="cat-actions">
              <button className="btn btn-s btn-sm" onClick={()=>{setCatForm({nombre:c.nombre,emoji:c.emoji});setModal({type:'cat-form',data:c});}}>Editar</button>
              <button className={`btn btn-sm ${c.activa?'btn-d':'btn-g'}`} onClick={()=>toggleActiva(c.id,!c.activa)}>{c.activa?'Desact.':'Activ.'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTarifas = () => (
    <div className="pad">
      <div className="st">Tarifas por categoría<button className="btn btn-p btn-sm" style={{marginLeft:'auto'}} onClick={()=>{setEditingTarifa({categoria_id:'',zona:'default',base:0,hora:0,min:0,max:0});setModal({type:'tarifa-form'});}}>+ Nueva tarifa</button></div>
      <div className="tw">
        <div className="th tarifa-head"><div className="tarifa-th">Categoría</div><div className="tarifa-th">Zona</div><div className="tarifa-th">Base</div><div className="tarifa-th">$/Hora</div><div className="tarifa-th">Mín</div><div className="tarifa-th">Máx</div></div>
        {tarifas.map(t=>(
          <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 80px'}}>
            <div className="tarifa-td">{(t as any).categorias?.emoji} {(t as any).categorias?.nombre}</div>
            <div className="tarifa-td">{t.zona}</div>
            <div className="tarifa-td" style={{color:'var(--green)'}}>R${t.precio_base}</div>
            <div className="tarifa-td">{t.precio_hora?`R$${t.precio_hora}`:'—'}</div>
            <div className="tarifa-td">{t.precio_min?`R$${t.precio_min}`:'—'}</div>
            <div className="tarifa-td">{t.precio_max?`R$${t.precio_max}`:'—'}</div>
          </div>
        ))}
        {tarifas.length===0&&<div style={{padding:'20px',textAlign:'center',color:'var(--muted)',fontSize:10}}>Sin tarifas configuradas</div>}
      </div>
    </div>
  );

  const renderNotificaciones = () => (
    <div className="pad">
      <div className="st">Notificaciones masivas</div>
      <div className="notif-compose">
        <div style={{fontSize:10,color:'var(--muted)',marginBottom:10,textTransform:'uppercase',letterSpacing:'1px'}}>Componer notificación</div>
        <div className="fgrid">
          <div className="fg full"><label>Título</label><input className="finput" value={notifForm.titulo} onChange={e=>setNotifForm(p=>({...p,titulo:e.target.value}))} placeholder="Título de la notificación"/></div>
          <div className="fg full"><label>Mensaje</label><textarea className="ftextarea" value={notifForm.cuerpo} onChange={e=>setNotifForm(p=>({...p,cuerpo:e.target.value}))} placeholder="Cuerpo del mensaje..."/></div>
          <div className="fg"><label>Destinatarios</label><select className="fselect" value={notifForm.target} onChange={e=>setNotifForm(p=>({...p,target:e.target.value}))}>
            <option value="todos">Todos los usuarios</option>
            <option value="clientes">Solo clientes</option>
            <option value="proveedores">Solo proveedores</option>
            <option value="zona">Por zona</option>
          </select></div>
          {notifForm.target==='zona'&&<div className="fg"><label>Zona</label><input className="finput" value={notifForm.zona} onChange={e=>setNotifForm(p=>({...p,zona:e.target.value}))} placeholder="Ej: Centro, Lagoa..."/></div>}
        </div>
        {notifResult&&<div style={{padding:'8px',background:'rgba(0,229,122,.08)',border:'1px solid rgba(0,229,122,.2)',borderRadius:'5px',fontSize:10,color:'var(--green)',marginBottom:8}}>✅ Enviadas a {notifResult.enviadas} usuarios</div>}
        <button className="btn btn-p" disabled={!notifForm.titulo.trim()||!notifForm.cuerpo.trim()} onClick={async()=>{const res=await enviarNotif(notifForm.titulo,notifForm.cuerpo,notifForm.target,notifForm.zona);setNotifResult(res);setNotifForm({titulo:'',cuerpo:'',target:'todos',zona:''});}}>
          📢 Enviar notificación
        </button>
      </div>
      <div style={{fontSize:10,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:'1px'}}>Historial de broadcasts</div>
      <div className="tw">
        <div className="th"><div className="tc" style={{flex:2}}>Título</div><div className="tc" style={{flex:2}}>Cuerpo</div><div className="tc" style={{flex:1}}>Hace</div></div>
        {notifHist.map(n=>(
          <div key={n.id} className="tr"><div className="tc" style={{flex:2,fontWeight:600}}>{n.titulo}</div><div className="tc" style={{flex:2,color:'var(--muted)'}}>{n.cuerpo?.substring(0,60)}...</div><div className="tc" style={{flex:1,color:'var(--muted)'}}>{timeAgo(n.created_at)}</div></div>
        ))}
        {notifHist.length===0&&<div style={{padding:'20px',textAlign:'center',color:'var(--muted)',fontSize:10}}>Sin broadcasts enviados</div>}
      </div>
    </div>
  );

  const renderReportes = () => (
    <div className="pad">
      <div className="st">Reportes & Exportación</div>
      <div className="report-grid">
        {[
          {icon:'📊',title:'Servicios 30 días',desc:'Todos los servicios del último mes con cliente, proveedor, monto y estado',action:()=>exportServicios(30).then(d=>downloadCSV(d,'ugo_servicios_30d.csv'))},
          {icon:'📈',title:'Servicios 90 días',desc:'Histórico trimestral de servicios para análisis de tendencias',action:()=>exportServicios(90).then(d=>downloadCSV(d,'ugo_servicios_90d.csv'))},
          {icon:'👥',title:'Todos los usuarios',desc:'Clientes y proveedores con karma, zona, servicios completados',action:()=>exportUsuarios().then(d=>downloadCSV(d,'ugo_usuarios.csv'))},
          {icon:'💰',title:'Resumen financiero',desc:'Ingresos, comisiones y métricas de los últimos 30 días',action:async()=>{const d=await exportServicios(30);const s={total:d?.length||0,ingresos:d?.reduce((a:number,r:any)=>a+(Number(r.tarifa)||0),0)||0,comision:d?.reduce((a:number,r:any)=>a+(Number(r.comision_ugo)||0),0)||0};downloadCSV([s],'ugo_financiero.csv');}},
          {icon:'🗺️',title:'Servicios por zona',desc:'Distribución geográfica de servicios para análisis de cobertura',action:async()=>{const d=await exportServicios(30);const z:any={};d?.forEach((r:any)=>{if(r.zona){if(!z[r.zona])z[r.zona]={zona:r.zona,servicios:0,ingresos:0};z[r.zona].servicios++;z[r.zona].ingresos+=Number(r.tarifa)||0;}});downloadCSV(Object.values(z),'ugo_zonas.csv');}},
          {icon:'⭐',title:'Ranking proveedores',desc:'Proveedores ordenados por karma, servicios completados e ingresos',action:async()=>{const d=await exportUsuarios();downloadCSV(d?.filter((u:any)=>u.tipo==='proveedor').sort((a:any,b:any)=>b.karma-a.karma)||[],'ugo_proveedores_ranking.csv');}},
        ].map(r=>(
          <div key={r.title} className="report-card">
            <div className="report-icon">{r.icon}</div>
            <div className="report-title">{r.title}</div>
            <div className="report-desc">{r.desc}</div>
            <button className="btn btn-p btn-sm" onClick={r.action}>⬇ Exportar CSV</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="pad">
      <div className="st">Configuración del sistema</div>

      {/* ── PARÁMETROS DEL SISTEMA ────────────────── */}
      <div className="tw">
        {Object.entries(config).filter(([k])=>!k.startsWith('api_') && !k.startsWith('hugo_prompt') && !k.startsWith('integration_') && !k.startsWith('template_') && !k.startsWith('referido_') && !k.startsWith('fraude_')).map(([k,v])=>(
          <div key={k} className="config-row">
            <div className="config-key">{k.replace(/_/g,' ')}</div>
            <div className="config-val">
              <input className="config-input" defaultValue={editingConfig[k]??v}
                onChange={e=>setEditingConfig(p=>({...p,[k]:e.target.value}))}
                onBlur={async e=>{if(e.target.value!==v){await updateConfig(k,e.target.value);}}}
              />
              {k.includes('pct')&&<span style={{fontSize:10,color:'var(--muted)'}}>%</span>}
              {k.includes('seg')&&<span style={{fontSize:10,color:'var(--muted)'}}>seg</span>}
              {k.includes('km')&&<span style={{fontSize:10,color:'var(--muted)'}}>km</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,fontSize:10,color:'var(--muted)',padding:'8px 12px',background:'var(--card)',borderRadius:'6px',border:'1px solid var(--border)'}}>
        Los cambios se guardan automáticamente al salir del campo.
      </div>
    </div>
  );


  const renderConexiones = () => (
    <div className="pad">
      <div className="st">Conexión de Apps</div>

      {/* Credenciales SDK */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'12px',padding:'14px',marginBottom:'12px'}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:'10px'}}>📡 Credenciales para las apps</div>
        {[
          {label:'SUPABASE_URL',val:'https://byajcqrgetloavrgyqak.supabase.co'},
          {label:'SUPABASE_ANON_KEY',val:'eyJ...(legacy key)'},
          {label:'PROJECT_ID',val:'byajcqrgetloavrgyqak'},
        ].map(r=>(
          <div key={r.label} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{fontSize:10,fontWeight:700,width:180,flexShrink:0}}>{r.label}</div>
            <div style={{flex:1,fontFamily:'monospace',fontSize:10,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.val}</div>
            <button className="btn btn-s btn-sm" onClick={()=>navigator.clipboard.writeText(r.val)}>Copiar</button>
          </div>
        ))}
      </div>

      {/* Edge Functions */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'12px',padding:'14px',marginBottom:'12px'}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:'10px'}}>⚡ Edge Functions disponibles</div>
        {[
          {fn:'service-create',  metodo:'POST', quien:'Cliente',   desc:'Crear solicitud de servicio → retorna proveedores cercanos'},
          {fn:'service-accept',  metodo:'POST', quien:'Proveedor', desc:'Aceptar un servicio disponible'},
          {fn:'service-status',  metodo:'POST', quien:'Ambos',     desc:'Actualizar estado: en_camino | ejecutando | completado | cancelado'},
          {fn:'provider-status', metodo:'POST', quien:'Proveedor', desc:'Ir online/offline, actualizar ubicación GPS'},
          {fn:'hugo-chat',       metodo:'POST', quien:'Ambos',     desc:'Chat con Hugo (Gemini 1.5 Flash)'},
        ].map(f=>(
          <div key={f.fn} style={{display:'grid',gridTemplateColumns:'160px 60px 70px 1fr',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border)',alignItems:'center',fontSize:10}}>
            <div style={{fontFamily:'monospace',fontWeight:700,color:'var(--cyan)'}}>{f.fn}</div>
            <span className="pill pill-c">{f.metodo}</span>
            <span className="pill pill-m">{f.quien}</span>
            <div style={{color:'var(--muted)'}}>{f.desc}</div>
          </div>
        ))}
        <div style={{marginTop:8,fontSize:10,color:'var(--muted)'}}>
          Base URL: <span style={{fontFamily:'monospace'}}>https://byajcqrgetloavrgyqak.supabase.co/functions/v1/</span>
          <br/>Auth: Header <span style={{fontFamily:'monospace'}}>Authorization: Bearer {'<supabase_session_token>'}</span>
        </div>
      </div>

      {/* Realtime channels */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'12px',padding:'14px',marginBottom:'12px'}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:'10px'}}>🔴 Canales Realtime</div>
        {[
          {canal:'servicios',     filtro:'cliente_id=eq.{mi_id}',    quien:'Cliente',   evento:'Actualizaciones del servicio (estado, proveedor asignado)'},
          {canal:'servicios',     filtro:'proveedor_id=eq.{mi_id}',   quien:'Proveedor', evento:'Servicios asignados y cambios de estado'},
          {canal:'servicios',     filtro:'estado=eq.negociando',       quien:'Proveedor', evento:'Nuevas solicitudes disponibles para aceptar'},
          {canal:'notificaciones',filtro:'usuario_id=eq.{mi_id}',     quien:'Ambos',     evento:'Notificaciones push in-app'},
          {canal:'usuarios',      filtro:'id=eq.{proveedor_id}',      quien:'Cliente',   evento:'Ubicación GPS del proveedor en tiempo real'},
        ].map((r,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'90px 1fr 70px',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:10,alignItems:'start'}}>
            <div style={{fontFamily:'monospace',fontWeight:700,color:'var(--purple)'}}>{r.canal}</div>
            <div><div style={{color:'var(--text)'}}>{r.evento}</div><div style={{color:'var(--muted)',fontFamily:'monospace',marginTop:2}}>{r.filtro}</div></div>
            <span className="pill pill-m">{r.quien}</span>
          </div>
        ))}
      </div>

      {/* Estado en vivo */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'12px',padding:'14px'}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:'10px'}}>📊 Estado en vivo</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
          {[
            {l:'Proveedores online',v:metrics?.proveedores_online??0,c:'var(--green)'},
            {l:'Servicios activos',v:metrics?.servicios_activos??0,c:'var(--cyan)'},
            {l:'Clientes totales',v:metrics?.clientes_total??0,c:'var(--text)'},
            {l:'Docs pendientes',v:metrics?.docs_pendientes??0,c:'var(--amber)'},
          ].map(s=>(
            <div key={s.l} style={{background:'var(--bg2)',borderRadius:8,padding:'10px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:s.c,fontFamily:'var(--head)'}}>{s.v}</div>
              <div style={{fontSize:9,color:'var(--muted)',marginTop:2,textTransform:'uppercase',letterSpacing:'.5px'}}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>
          ✓ Supabase Realtime activo · ✓ RLS configurado para cliente/proveedor · ✓ 4 Edge Functions deployadas
        </div>
      </div>
    </div>
  );

  const renderFinanzas = () => (
    <div className="pad">
      <div className="st">Finanzas & Bóveda</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginBottom:10}}>
        <div className="mc" style={{color:'var(--green)'}}><div className="mc-l">Bóveda retenida</div><div className="mc-v" style={{color:'var(--green)'}}>{fmt(escrows.reduce((a,e)=>a+Number(e.monto_total),0),'R$')}</div><div className="mc-s">{escrows.length} escrows</div></div>
        <div className="mc" style={{color:'var(--cyan)'}}><div className="mc-l">Comisión 30d</div><div className="mc-v" style={{color:'var(--cyan)'}}>{fmt(kpis?.comision_total,'R$')}</div><div className="mc-s">U.GO 15%</div></div>
        <div className="mc" style={{color:'var(--amber)'}}><div className="mc-l">Retiros pendientes</div><div className="mc-v" style={{color:'var(--amber)'}}>{withdrawals.length}</div><div className="mc-s">proveedores</div></div>
      </div>
      <div className="tw">
        <div className="th"><div className="tc" style={{flex:1.5}}>Cliente</div><div className="tc" style={{flex:1.5}}>Proveedor</div><div className="tc" style={{flex:1}}>Total</div><div className="tc" style={{flex:1}}>Comisión</div><div className="tc" style={{flex:1}}>Neto</div><div className="tc" style={{flex:0.8}}>Hace</div><div className="tc" style={{flex:1}}>Liberar</div></div>
        {escrows.map(e=>(
          <div key={e.id} className="tr">
            <div className="tc" style={{flex:1.5}}>{(e as any).clientes?.nombre||'—'}</div>
            <div className="tc" style={{flex:1.5}}>{(e as any).proveedores?.nombre||'—'}</div>
            <div className="tc" style={{flex:1,color:'var(--green)'}}>{fmt(e.monto_total,'R$')}</div>
            <div className="tc" style={{flex:1,color:'var(--cyan)'}}>{fmt(e.comision_ugo,'R$')}</div>
            <div className="tc" style={{flex:1}}>{fmt(e.monto_proveedor,'R$')}</div>
            <div className="tc" style={{flex:0.8,color:'var(--muted)'}}>{timeAgo(e.created_at)}</div>
            <div className="tc" style={{flex:1}}><button className="btn btn-g btn-sm" onClick={()=>liberarEscrow(e.id)}>Liberar</button></div>
          </div>
        ))}
        {escrows.length===0&&<div style={{padding:'20px',textAlign:'center',color:'var(--muted)',fontSize:10}}>Bóveda vacía</div>}
      </div>
    </div>
  );

  // ── Nav ────────────────────────────────────────────────────
  const NAV: {id:Section;icon:string;label:string;badge?:number}[][] = [
    [{id:'dashboard',icon:'◈',label:'Panel'},{id:'mapa',icon:'◉',label:'Mapa'},{id:'alertas',icon:'△',label:'Alertas',badge:(criticalCount+warningCount)||undefined}],
    [{id:'servicios',icon:'⊞',label:'Servs'},{id:'disputas',icon:'⊘',label:'Disput',badge:disputes.length||undefined},{id:'finanzas',icon:'⊛',label:'Finanzas'}],
    [{id:'usuarios',icon:'◎',label:'Usrs'},{id:'documentos',icon:'⊟',label:'Docs',badge:docs.length||undefined}],
    [{id:'categorias',icon:'⊕',label:'Cats'},{id:'tarifas',icon:'⊙',label:'Tarifas'},{id:'notificaciones',icon:'⊜',label:'Notifs'},{id:'reportes',icon:'⊗',label:'Reports'},{id:'config',icon:'⚙',label:'Config'}],
  ];

  if (authLoading) return (
    <div style={{position:'fixed',inset:0,background:'#F7F7F7',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{fontFamily:'Inter',fontSize:'13px',color:'#888'}}>Cargando U.GO...</div>
    </div>
  );

  if (!session) return (
    <div style={{position:'fixed',inset:0,background:'linear-gradient(160deg,#0f1117,#1a2530)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{fontFamily:'Inter',fontWeight:900,fontSize:'36px',color:'#FFF',letterSpacing:'-1.5px',marginBottom:'4px'}}>U.GO</div>
      <div style={{fontFamily:'Inter',fontSize:'11px',color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'2.5px',marginBottom:'32px'}}>Panel de Control</div>
      <div style={{background:'#FFF',borderRadius:'24px',padding:'24px',width:'100%',maxWidth:'360px'}}>
        {loginErr && <div style={{background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:'10px',padding:'9px 12px',fontSize:'12px',color:'#DC2626',marginBottom:'12px'}}>{loginErr}</div>}
        <div style={{fontWeight:800,fontSize:'20px',marginBottom:'4px'}}>Acceso restringido</div>
        <div style={{fontSize:'13px',color:'#888',marginBottom:'20px'}}>Solo administradores autorizados</div>
        <div style={{marginBottom:'11px'}}>
          <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.6px',color:'#888',marginBottom:'4px'}}>Email</div>
          <input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} type="email" style={{width:'100%',padding:'11px 13px',border:'1.5px solid #E5E5E5',borderRadius:'12px',fontSize:'14px',fontFamily:'Inter',outline:'none',color:'#111'}}/>
        </div>
        <div style={{marginBottom:'16px'}}>
          <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.6px',color:'#888',marginBottom:'4px'}}>Contraseña</div>
          <input value={loginPass} onChange={e=>setLoginPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} type="password" placeholder="••••••••" style={{width:'100%',padding:'11px 13px',border:'1.5px solid #E5E5E5',borderRadius:'12px',fontSize:'14px',fontFamily:'Inter',outline:'none',color:'#111'}}/>
        </div>
        <button onClick={doLogin} style={{width:'100%',padding:'13px',background:'#111',color:'#FFF',border:'none',borderRadius:'14px',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'Inter'}}>Ingresar →</button>
      </div>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="ua">
        <div className="ua-tb">
          <div><div className="ua-logo">U.GO</div><div className="ua-logo-sub">Quantum OS</div></div>
          {metrics&&<>{criticalCount>0&&<div className="chip chip-r" onClick={()=>setSection('alertas')}>🚨 {criticalCount} críticas</div>}{disputes.length>0&&<div className="chip chip-a">⚖️ {disputes.length}</div>}</>}
          <div className="ua-tb-r"><div className="live-pill"><div className="live-dot"/>LIVE</div><div className="ua-clock">{clock}</div></div>
        </div>

        <nav className="ua-nav">
          {NAV.map((group, gi) => (
            <React.Fragment key={gi}>
              {gi>0&&<div className="nav-div"/>}
              {group.map(n=>(
                <button key={n.id} className={`nav-item${section===n.id?' active':''}`} onClick={()=>setSection(n.id)}>
                  {n.badge?<div className="nav-badge">{n.badge>9?'9+':n.badge}</div>:null}
                  <span>{n.icon}</span><span className="nav-label">{n.label}</span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <main className="ua-main">
          <div className="map-wrap" style={{display:section==='mapa'?'block':'none'}}>
            <div className="map-stats"><div className="map-pill"><span style={{color:'var(--green)'}}>●</span>{provDisp} libres</div><div className="map-pill"><span style={{color:'var(--amber)'}}>●</span>{mapProviders.filter(p=>!p.disponible).length} en servicio</div></div>
            <div ref={mapDivRef} style={{height:'100%',width:'100%',background:'var(--bg)'}}/>
            <div className="map-sb">
              <div className="map-sb-h">Proveedores online</div>
              {mapProviders.map(p=>(
                <div key={p.id} className="map-pi" onClick={()=>{if(mapRef.current&&p.lat&&p.lng)mapRef.current.setView([p.lat,p.lng],15);}}>
                  <div className="map-pn"><span className="map-dot" style={{background:p.disponible?'var(--green)':'var(--amber)'}}/>{p.nombre} {p.apellido||''}</div>
                  <div className="map-ps">⭐{p.karma} · {p.disponible?'disponible':(p.categoria_nombre||'en trabajo')}</div>
                </div>
              ))}
              {mapProviders.length===0&&<div style={{padding:'14px',textAlign:'center',color:'var(--muted)',fontSize:9}}>Sin proveedores online</div>}
            </div>
            <div className="map-leg"><span><span className="leg-dot" style={{background:'var(--green)'}}/>Libre</span><span><span className="leg-dot" style={{background:'var(--amber)'}}/>En servicio</span></div>
          </div>
          {section==='dashboard'&&renderDashboard()}
          {section==='alertas'&&renderAlertas()}
          {section==='servicios'&&renderServicios()}
          {section==='disputas'&&renderDisputas()}
          {section==='usuarios'&&renderUsuarios()}
          {section==='documentos'&&renderDocumentos()}
          {section==='finanzas'&&renderFinanzas()}
          {section==='categorias'&&renderCategorias()}
          {section==='tarifas'&&renderTarifas()}
          {section==='notificaciones'&&renderNotificaciones()}
          {section==='reportes'&&renderReportes()}
          {section==='config'&&renderConfig()}
        </main>

        <aside className="ua-hugo">
          <div className="hugo-hd"><div className="hugo-orb"/><div><div className="hugo-name">Hugo</div><div className="hugo-mode">admin soberano</div></div></div>
          <div className="hugo-msgs">
            {chat.map((m,i)=>(<div key={i}><div className={`hm hm-${m.role}`}>{m.text}</div><div className="hm-time">{m.ts.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div></div>))}
            {hugoLoading&&<div className="htyping"><div className="ht"/><div className="ht"/><div className="ht"/></div>}
            {pendingAct&&<div className="hugo-act"><div className="ha-lbl">⚡ Acción pendiente</div><div className="ha-desc">{pendingAct}</div><div className="ha-btns"><button className="ha-yes" onClick={()=>{sendHugo(`Autorizado: ${pendingAct}`);setPendingAct(null);}}>✓ Autorizar</button><button className="ha-no" onClick={()=>{setChat(c=>[...c,{role:'admin',text:'Cancelado.',ts:new Date()}]);setPendingAct(null);}}>✗ Cancelar</button></div></div>}
            <div ref={msgEndRef}/>
          </div>
          <div className="hugo-inp-row">
            <input ref={msgEndRef as any} className="hugo-in" placeholder="Pregunta a Hugo..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendHugo(input)}/>
            <button className="hugo-send" onClick={()=>sendHugo(input)}>→</button>
          </div>
        </aside>
      </div>

      {/* MODAL: Categoría */}
      {modal.type==='cat-form'&&(
        <div className="modal-bd" onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>
          <div className="modal-box">
            <div className="modal-title"><span>{modal.data?'Editar':'Nueva'} categoría</span><button className="mclose" onClick={closeModal}>✕</button></div>
            <div className="fgrid">
              <div className="fg"><label>Emoji</label><input className="finput" value={catForm.emoji} onChange={e=>setCatForm(p=>({...p,emoji:e.target.value}))} style={{fontSize:22,textAlign:'center'}}/></div>
              <div className="fg"><label>Nombre</label><input className="finput" value={catForm.nombre} onChange={e=>setCatForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Electricista"/></div>
            </div>
            <div className="modal-acts">
              <button className="btn btn-p" disabled={!catForm.nombre.trim()} onClick={async()=>{if(modal.data)await actualizarCat(modal.data.id,catForm.nombre,catForm.emoji,modal.data.activa);else await crearCat(catForm.nombre,catForm.emoji);closeModal();}}>
                {modal.data?'Guardar cambios':'Crear categoría'}
              </button>
              <button className="btn btn-s" onClick={closeModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Usuario */}
      {(modal.type==='user-form'||modal.type==='user-edit')&&(
        <div className="modal-bd" onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>
          <div className="modal-box">
            <div className="modal-title"><span>{modal.type==='user-form'?'Crear':'Editar'} usuario</span><button className="mclose" onClick={closeModal}>✕</button></div>
            <div className="fgrid">
              <div className="fg"><label>Nombre</label><input className="finput" value={userForm.nombre} onChange={e=>setUserForm(p=>({...p,nombre:e.target.value}))} placeholder="Nombre"/></div>
              <div className="fg"><label>Apellido</label><input className="finput" value={userForm.apellido} onChange={e=>setUserForm(p=>({...p,apellido:e.target.value}))} placeholder="Apellido"/></div>
              <div className="fg full"><label>Email</label><input className="finput" value={userForm.email} onChange={e=>setUserForm(p=>({...p,email:e.target.value}))} placeholder="email@ejemplo.com" disabled={modal.type==='user-edit'}/></div>
              <div className="fg"><label>Tipo</label><select className="fselect" value={userForm.tipo} onChange={e=>setUserForm(p=>({...p,tipo:e.target.value}))} disabled={modal.type==='user-edit'}><option value="cliente">Cliente</option><option value="proveedor">Proveedor</option></select></div>
              <div className="fg"><label>Teléfono</label><input className="finput" value={userForm.telefono} onChange={e=>setUserForm(p=>({...p,telefono:e.target.value}))} placeholder="+55 48 9 9999-9999"/></div>
              <div className="fg"><label>Zona</label><input className="finput" value={userForm.zona} onChange={e=>setUserForm(p=>({...p,zona:e.target.value}))} placeholder="Ej: Centro, Lagoa"/></div>
              <div className="fg"><label>País</label><select className="fselect" value={userForm.pais} onChange={e=>setUserForm(p=>({...p,pais:e.target.value}))}><option value="BR">Brasil 🇧🇷</option><option value="AR">Argentina 🇦🇷</option><option value="CO">Colombia 🇨🇴</option><option value="MX">México 🇲🇽</option></select></div>
            </div>
            <div className="modal-acts">
              <button className="btn btn-p" disabled={!userForm.nombre.trim()||!userForm.email.trim()} onClick={async()=>{if(modal.type==='user-form')await crearUsuario(userForm);else await updateUsuario(modal.data.id,{...userForm,activo:modal.data.activo});closeModal();}}>
                {modal.type==='user-form'?'Crear usuario':'Guardar cambios'}
              </button>
              <button className="btn btn-s" onClick={closeModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Crear Servicio */}
      {modal.type==='servicio-form'&&(
        <div className="modal-bd" onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>
          <div className="modal-box">
            <div className="modal-title"><span>Crear servicio manual</span><button className="mclose" onClick={closeModal}>✕</button></div>
            <div className="fgrid">
              <div className="fg"><label>Cliente</label><select className="fselect" value={servForm.cliente_id} onChange={e=>setServForm(p=>({...p,cliente_id:e.target.value}))}><option value="">Seleccionar cliente...</option>{users.filter(u=>u.tipo==='cliente').map(u=><option key={u.id} value={u.id}>{u.nombre} {u.apellido||''}</option>)}</select></div>
              <div className="fg"><label>Proveedor (opcional)</label><select className="fselect" value={servForm.proveedor_id} onChange={e=>setServForm(p=>({...p,proveedor_id:e.target.value}))}><option value="">Sin asignar</option>{users.filter(u=>u.tipo==='proveedor'&&u.activo).map(u=><option key={u.id} value={u.id}>{u.nombre} {u.apellido||''}</option>)}</select></div>
              <div className="fg"><label>Categoría</label><select className="fselect" value={servForm.categoria_id} onChange={e=>setServForm(p=>({...p,categoria_id:e.target.value}))}><option value="">Sin categoría</option>{categorias.filter(c=>c.activa).map(c=><option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}</select></div>
              <div className="fg"><label>Zona</label><input className="finput" value={servForm.zona} onChange={e=>setServForm(p=>({...p,zona:e.target.value}))} placeholder="Ej: Centro"/></div>
              <div className="fg"><label>Tarifa (R$)</label><input className="finput" type="number" value={servForm.tarifa} onChange={e=>setServForm(p=>({...p,tarifa:e.target.value}))} placeholder="0.00"/></div>
              <div className="fg full"><label>Descripción</label><textarea className="ftextarea" value={servForm.descripcion} onChange={e=>setServForm(p=>({...p,descripcion:e.target.value}))} placeholder="Descripción del trabajo..."/></div>
            </div>
            <div className="modal-acts">
              <button className="btn btn-p" disabled={!servForm.cliente_id} onClick={async()=>{await crearServicio({...servForm,tarifa:servForm.tarifa?Number(servForm.tarifa):null});refetchServices();closeModal();}}>
                Crear servicio
              </button>
              <button className="btn btn-s" onClick={closeModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tarifa */}
      {modal.type==='tarifa-form'&&(
        <div className="modal-bd" onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>
          <div className="modal-box">
            <div className="modal-title"><span>Nueva tarifa</span><button className="mclose" onClick={closeModal}>✕</button></div>
            <div className="fgrid">
              <div className="fg"><label>Categoría</label><select className="fselect" value={editingTarifa?.categoria_id||''} onChange={e=>setEditingTarifa((p:any)=>({...p,categoria_id:e.target.value}))}><option value="">Seleccionar...</option>{categorias.filter(c=>c.activa).map(c=><option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}</select></div>
              <div className="fg"><label>Zona</label><input className="finput" value={editingTarifa?.zona||'default'} onChange={e=>setEditingTarifa((p:any)=>({...p,zona:e.target.value}))} placeholder="default"/></div>
              <div className="fg"><label>Precio base (R$)</label><input className="finput" type="number" value={editingTarifa?.base||0} onChange={e=>setEditingTarifa((p:any)=>({...p,base:Number(e.target.value)}))} /></div>
              <div className="fg"><label>Precio / hora (R$)</label><input className="finput" type="number" value={editingTarifa?.hora||''} onChange={e=>setEditingTarifa((p:any)=>({...p,hora:Number(e.target.value)}))} placeholder="Opcional"/></div>
              <div className="fg"><label>Precio mínimo (R$)</label><input className="finput" type="number" value={editingTarifa?.min||''} onChange={e=>setEditingTarifa((p:any)=>({...p,min:Number(e.target.value)}))} placeholder="Opcional"/></div>
              <div className="fg"><label>Precio máximo (R$)</label><input className="finput" type="number" value={editingTarifa?.max||''} onChange={e=>setEditingTarifa((p:any)=>({...p,max:Number(e.target.value)}))} placeholder="Opcional"/></div>
            </div>
            <div className="modal-acts">
              <button className="btn btn-p" disabled={!editingTarifa?.categoria_id} onClick={async()=>{await upsertTarifa(editingTarifa.categoria_id,editingTarifa.zona||'default',{base:editingTarifa.base,hora:editingTarifa.hora||null,min:editingTarifa.min||null,max:editingTarifa.max||null});closeModal();}}>
                Guardar tarifa
              </button>
              <button className="btn btn-s" onClick={closeModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Document preview */}
      {modal.type==='doc-preview'&&modal.data&&(
        <div className="modal-bd" onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>
          <div className="modal-box">
            <div className="modal-title"><span>📄 {modal.data.tipo?.toUpperCase()} — {(modal.data.usuarios?.nombre||'')} {modal.data.usuarios?.apellido||''}</span><button className="mclose" onClick={closeModal}>✕</button></div>
            {previewLoading&&<div style={{textAlign:'center',padding:'30px',color:'var(--muted)'}}>Cargando documento...</div>}
            {previewUrl&&!previewLoading&&(previewUrl.includes('.pdf')||modal.data.url_storage?.includes('.pdf')?<iframe src={previewUrl} className="modal-pdf" title="doc"/>:<img src={previewUrl} className="modal-preview" alt="documento"/>)}
            {!previewUrl&&!previewLoading&&<div style={{textAlign:'center',padding:'20px',color:'var(--muted)',fontSize:10,background:'var(--bg2)',borderRadius:5}}>Sin archivo adjunto</div>}
            <div style={{marginTop:10,fontSize:10,color:'var(--muted)'}}>Notas:</div>
            <textarea className="ftextarea" style={{marginTop:5}} value={docNotes} onChange={e=>setDocNotes(e.target.value)} placeholder="Motivo de aprobación/rechazo..."/>
            <div className="modal-acts">
              <button className="btn btn-g" onClick={()=>{updateEstado(modal.data.id,'aprobado',docNotes);closeModal();}}>✓ Aprobar</button>
              <button className="btn btn-d" onClick={()=>{updateEstado(modal.data.id,'rechazado',docNotes);closeModal();}}>✗ Rechazar</button>
              <button className="btn btn-s" onClick={()=>{updateEstado(modal.data.id,'reenvio_solicitado',docNotes);closeModal();}}>↺ Pedir reenvío</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Resolver disputa */}
      {modal.type==='disputa'&&modal.data&&(
        <div className="modal-bd" onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>
          <div className="modal-box">
            <div className="modal-title"><span>⚖️ Resolver {modal.data.numero}</span><button className="mclose" onClick={closeModal}>✕</button></div>
            <div className="fgrid">
              <div className="fg"><label>Monto disputado</label><div style={{fontSize:16,fontWeight:700,color:'var(--red)',padding:'7px 0'}}>{fmt(modal.data.monto_disputado,'R$')}</div></div>
              <div className="fg"><label>Partes</label><div style={{fontSize:11,padding:'7px 0'}}>{(modal.data as any).clientes?.nombre} vs {(modal.data as any).proveedores?.nombre}</div></div>
              <div className="fg full"><label>Motivo</label><div style={{fontSize:10,color:'var(--muted)',padding:'5px 0'}}>{modal.data.motivo}</div></div>
            </div>
            <div style={{fontSize:9,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'.8px'}}>Resolver a favor de:</div>
            <div style={{display:'flex',gap:7,marginBottom:10}}>
              <button className={`btn ${disputeFavor==='cliente'?'btn-p':'btn-s'}`} onClick={()=>setDisputeFavor('cliente')}>👤 Cliente</button>
              <button className={`btn ${disputeFavor==='proveedor'?'btn-p':'btn-s'}`} onClick={()=>setDisputeFavor('proveedor')}>🔧 Proveedor</button>
            </div>
            <textarea className="ftextarea" value={disputeRes} onChange={e=>setDisputeRes(e.target.value)} placeholder="Detalla la resolución y justificación..."/>
            <div className="modal-acts">
              <button className="btn btn-p" disabled={!disputeRes.trim()} onClick={async()=>{await resolverDisputa(modal.data.id,disputeRes,disputeFavor);closeModal();}}>✓ Confirmar resolución</button>
              <button className="btn btn-s" onClick={()=>sendHugo(`Ayudame a resolver la disputa ${modal.data.numero}: ${modal.data.motivo}`)}>Consultar Hugo primero</button>
            </div>
          </div>
        </div>
      )}
      {/* RT TOASTS */}
      <div style={{position:'fixed',bottom:20,right:20,zIndex:9999,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none'}}>
        {rtToasts.map(t=>(
          <div key={t.id} style={{background:t.color,color:'#FFF',padding:'10px 16px',borderRadius:12,fontSize:12,fontWeight:700,boxShadow:'0 4px 16px rgba(0,0,0,.2)',animation:'slideIn .3s ease',maxWidth:280}}>
            {t.msg}
          </div>
        ))}
      </div>
      <ConversationalOrb metrics={metrics}/>

      {/* MODAL: Contactar proveedor */}
      {contactModal && (
        <div className="modal-bd" onClick={e=>{if(e.target===e.currentTarget){setContactModal(null);}}}>
          <div className="modal-box">
            <div className="modal-title">
              <span>📨 Mensaje para {contactModal.nombre} {contactModal.apellido||''}</span>
              <button className="mclose" onClick={()=>setContactModal(null)}>✕</button>
            </div>
            {!contactSent ? (
              <>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'var(--bg2)',borderRadius:8,marginBottom:12,fontSize:11}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:contactModal.online?'var(--green)':'var(--muted)',display:'inline-block'}}/>
                  <span>{contactModal.online?'🟢 Online — recibirá el mensaje en la app ahora mismo':'⚪ Offline — recibirá el mensaje cuando se conecte'}</span>
                </div>
                <div style={{marginBottom:9}}><div style={{fontSize:9,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:4}}>Título</div>
                  <input className="finput" value={contactMsg.titulo} onChange={e=>setContactMsg(p=>({...p,titulo:e.target.value}))} placeholder="Ej: Actualización de tu cuenta"/>
                </div>
                <div style={{marginBottom:9}}><div style={{fontSize:9,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:4}}>Mensaje</div>
                  <textarea className="ftextarea" value={contactMsg.cuerpo} onChange={e=>setContactMsg(p=>({...p,cuerpo:e.target.value}))} placeholder="Escribí el mensaje para el proveedor..."/>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                  {['Revisá tu karma — bajó a menos de 4.0','Tu documentación fue aprobada ✓','Tu cuenta fue reactivada','Hay alta demanda en tu zona ahora'].map(t=>(
                    <button key={t} className="btn btn-s" style={{fontSize:9,padding:'3px 8px'}} onClick={()=>setContactMsg(p=>({...p,titulo:t.length<30?t:'Mensaje U.GO',cuerpo:t.length>=30?t:p.cuerpo}))}>{t.slice(0,24)}...</button>
                  ))}
                </div>
                <div className="modal-acts">
                  <button className="btn btn-p" disabled={!contactMsg.titulo.trim()||!contactMsg.cuerpo.trim()} onClick={async()=>{
                    const sb = (await import('../lib/supabase')).supabase as any;
                    await sb.rpc('admin_send_notification',{p_usuario_id:contactModal.id,p_titulo:contactMsg.titulo,p_cuerpo:contactMsg.cuerpo});
                    setContactSent(true);
                  }}>📨 Enviar mensaje</button>
                  <button className="btn btn-s" onClick={()=>setContactModal(null)}>Cancelar</button>
                  <button className="btn btn-s" style={{marginLeft:'auto'}} onClick={()=>sendHugo(`Redactá un mensaje profesional para el proveedor ${contactModal.nombre} sobre: ${contactMsg.titulo}`)}>✨ Ayuda de Hugo</button>
                </div>
              </>
            ) : (
              <div style={{textAlign:'center',padding:'24px 0'}}>
                <div style={{fontSize:40,marginBottom:12}}>✅</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>Mensaje enviado</div>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>{contactModal.nombre} {contactModal.online?'lo recibió en su app ahora mismo.':'lo recibirá cuando se conecte.'}</div>
                <button className="btn btn-p" onClick={()=>setContactModal(null)}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AdminPanel;

