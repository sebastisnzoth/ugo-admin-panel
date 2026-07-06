import React from 'react';

interface DashboardSectionProps {
  metrics: any;
  kpis: any;
  weekData: any[];
  maxRev: number;
  alerts: any[];
  criticalCount: number;
  warningCount: number;
  feed: any[];
  setSection: any;
  sendHugo: (msg: string) => void;
  timeAgo: (date: string) => string;
  fmt: (val: any, curr: string) => string;
  fmtN: (val: any) => string;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  metrics,
  kpis,
  weekData,
  maxRev,
  alerts,
  criticalCount,
  warningCount,
  feed,
  setSection,
  sendHugo,
  timeAgo,
  fmt,
  fmtN,
}) => (
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
