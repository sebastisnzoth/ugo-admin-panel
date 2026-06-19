import React, { useState, useCallback, useEffect } from 'react';
import {
  useZonas, usePromos, useSurge, useHorarios,
  useOnboarding, useAdminRoles, useRatings, useAdvancedConfig,
} from '../hooks/useAdvancedData';
import { useCategorias } from '../hooks/useAdminData';



const timeAgo = (d: string) => { const s=(Date.now()-new Date(d).getTime())/1000; if(s<3600) return `${Math.floor(s/60)}m`; if(s<86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const DIAS = ['lun','mar','mie','jue','vie','sab','dom'];
const PERMISOS_OPTS = ['dashboard','servicios','disputas','usuarios','documentos','finanzas','reportes'];

// ─── Estilos comunes (reutiliza vars CSS del AdminPanel) ─────
const S = {
  wrap: {padding:'12px',overflowY:'auto' as const,height:'100%'},
  title: {fontFamily:'Inter,sans-serif',fontSize:'16px',fontWeight:800,color:'#fff',marginBottom:'14px',display:'flex',alignItems:'center',gap:'8px',letterSpacing:'-.3px'},
  card: {background:'#FFFFFF',border:'1px solid rgba(0,0,0,.1)',borderRadius:'12px',padding:'14px',marginBottom:'10px'},
  row: {display:'flex',alignItems:'center',gap:'8px',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.06)'},
  label: {fontSize:'9px',color:'rgba(0,0,0,.5)',textTransform:'uppercase' as const,letterSpacing:'.8px',marginBottom:'4px'},
  val: {fontSize:'11px',color:'#000000'},
  input: {background:'#F6F6F6',border:'1px solid rgba(0,0,0,.12)',borderRadius:'6px',padding:'6px 9px',color:'#000000',fontFamily:'Inter,sans-serif',fontSize:'11px',outline:'none',width:'100%'},
  select: {background:'#F6F6F6',border:'1px solid rgba(0,0,0,.12)',borderRadius:'6px',padding:'6px 9px',color:'#000000',fontFamily:'Inter,sans-serif',fontSize:'11px',outline:'none',width:'100%',cursor:'pointer'},
  btn: (variant='p') => ({padding:'5px 14px',borderRadius:'50px',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:'10px',fontWeight:700,background:variant==='p'?'#06C167':variant==='d'?'rgba(225,25,0,.15)':'rgba(255,255,255,.08)',color:variant==='p'?'#FFFFFF':variant==='d'?'#E11900':'#000000',border:variant==='d'?'1px solid rgba(225,25,0,.3)':variant==='s'?'1px solid rgba(255,255,255,.12)':'none'} as React.CSSProperties),
  pill: (c='g') => ({display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:'50px',fontSize:'8px',fontWeight:700,textTransform:'uppercase' as const,background:c==='g'?'rgba(5,148,79,.1)':c==='r'?'rgba(225,25,0,.12)':'rgba(255,193,67,.12)',color:c==='g'?'#05944F':c==='r'?'#E11900':'#FFC043',border:`1px solid ${c==='g'?'rgba(5,148,79,.3)':c==='r'?'rgba(225,25,0,.3)':'rgba(255,193,67,.3)'}`}),
  tabRow: {display:'flex',borderBottom:'1px solid rgba(0,0,0,.1)',marginBottom:'12px'},
  tab: (active: boolean) => ({padding:'7px 14px',cursor:'pointer',border:'none',background:'transparent',color:active?'#06C167':'rgba(244,244,244,.45)',fontFamily:'Inter,sans-serif',fontSize:'10px',borderBottom:`2px solid ${active?'#06C167':'transparent'}`,transition:'all .15s'}),
  grid2: {display:'grid',gridTemplateColumns:'1fr 1fr',gap:'9px',marginBottom:'10px'},
  modalBd: {position:'fixed' as const,inset:0,background:'rgba(0,0,0,.85)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center'},
  modalBox: {background:'#FFFFFF',border:'1px solid rgba(0,0,0,.15)',borderRadius:'16px',padding:'20px',width:'min(580px,93vw)',maxHeight:'90vh',overflowY:'auto' as const},
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={S.modalBd} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={S.modalBox}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
          <span style={{fontFamily:'Inter',fontSize:'14px',fontWeight:700,color:'#05944F'}}>{title}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(0,0,0,.5)',fontSize:'18px',cursor:'pointer'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── ZONAS ────────────────────────────────────────────────────
export function SecZonas() {
  const { zonas, upsert, toggle } = useZonas();
  const [modal, setModal] = useState<any>(null);
  const empty = { nombre:'', lat:'-27.5954', lng:'-48.5480', radio_km:'5', min_proveedores:'1', activa:true, hora_inicio:'07:00', hora_fin:'22:00' };
  const [form, setForm] = useState(empty);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={S.wrap}>
      <div style={S.title}>Zonas de cobertura <button style={S.btn()} onClick={() => { setForm(empty); setModal('new'); }}>+ Nueva zona</button></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'9px'}}>
        {zonas.map(z => (
          <div key={z.id} style={{...S.card,opacity:z.activa?1:.5}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
              <div style={{fontWeight:700,fontSize:'13px'}}>{z.nombre}</div>
              <span style={S.pill(z.activa?'g':'r')}>{z.activa?'activa':'inactiva'}</span>
            </div>
            <div style={{fontSize:'10px',color:'rgba(0,0,0,.5)',marginBottom:'6px'}}>📍 {z.ciudad} · {z.radio_km}km radio</div>
            <div style={{fontSize:'10px',color:'rgba(0,0,0,.5)',marginBottom:'8px'}}>⏰ {z.hora_inicio}–{z.hora_fin} · min {z.min_proveedores} proveedor(es)</div>
            <div style={{display:'flex',gap:'5px'}}>
              <button style={S.btn('s')} onClick={() => { setForm({...z, lat:String(z.lat), lng:String(z.lng), radio_km:String(z.radio_km), min_proveedores:String(z.min_proveedores)}); setModal(z.id); }}>Editar</button>
              <button style={S.btn(z.activa?'d':'p')} onClick={() => toggle(z.id, !z.activa)}>{z.activa?'Desactivar':'Activar'}</button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title={modal==='new'?'Nueva zona':'Editar zona'} onClose={() => setModal(null)}>
          <div style={S.grid2}>
            <div><div style={S.label}>Nombre</div><input style={S.input} value={form.nombre} onChange={f('nombre')} placeholder="Centro, Lagoa..."/></div>
            <div><div style={S.label}>Radio (km)</div><input style={S.input} type="number" value={form.radio_km} onChange={f('radio_km')}/></div>
            <div><div style={S.label}>Latitud</div><input style={S.input} value={form.lat} onChange={f('lat')}/></div>
            <div><div style={S.label}>Longitud</div><input style={S.input} value={form.lng} onChange={f('lng')}/></div>
            <div><div style={S.label}>Horario inicio</div><input style={S.input} type="time" value={form.hora_inicio} onChange={f('hora_inicio')}/></div>
            <div><div style={S.label}>Horario fin</div><input style={S.input} type="time" value={form.hora_fin} onChange={f('hora_fin')}/></div>
            <div><div style={S.label}>Min. proveedores</div><input style={S.input} type="number" value={form.min_proveedores} onChange={f('min_proveedores')}/></div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',paddingTop:'18px'}}>
              <input type="checkbox" checked={form.activa} onChange={e=>setForm(p=>({...p,activa:e.target.checked}))} id="zona-activa"/>
              <label htmlFor="zona-activa" style={{fontSize:'11px'}}>Zona activa</label>
            </div>
          </div>
          <div style={{display:'flex',gap:'7px',marginTop:'12px'}}>
            <button style={S.btn()} onClick={async()=>{ await upsert(modal==='new'?form:{...form,id:modal}); setModal(null); }}>Guardar</button>
            <button style={S.btn('s')} onClick={()=>setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── PROMOS ───────────────────────────────────────────────────
export function SecPromos() {
  const { promos, upsert, toggle } = usePromos();
  const { categorias } = useCategorias();
  const [modal, setModal] = useState<any>(null);
  const empty = { codigo:'', descripcion:'', tipo:'porcentaje', valor:'10', usos_max:'', solo_primer_servicio:false, activo:true, expira_at:'', categoria_id:'' };
  const [form, setForm] = useState(empty);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.type==='checkbox'?e.target.checked:e.target.value }));

  return (
    <div style={S.wrap}>
      <div style={S.title}>Códigos promocionales <button style={S.btn()} onClick={() => { setForm(empty); setModal('new'); }}>+ Nuevo código</button></div>
      <div style={{background:'#FFFFFF',border:'1px solid rgba(0,0,0,.1)',borderRadius:'12px',overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr',padding:'8px 12px',background:'rgba(0,0,0,.04)',borderBottom:'1px solid rgba(0,0,0,.1)',fontSize:'8px',textTransform:'uppercase',letterSpacing:'.8px',color:'rgba(0,0,0,.5)'}}>
          <span>Código</span><span>Tipo</span><span>Valor</span><span>Usos</span><span>Expira</span><span>Estado</span><span>Acciones</span>
        </div>
        {promos.map(p => (
          <div key={p.id} style={{display:'grid',gridTemplateColumns:'1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr',padding:'9px 12px',borderBottom:'1px solid rgba(0,0,0,.08)',alignItems:'center',fontSize:'11px'}}>
            <span style={{fontWeight:700,color:'#05944F',fontFamily:'monospace'}}>{p.codigo}</span>
            <span style={{color:'rgba(244,244,244,.65)'}}>{p.tipo}</span>
            <span>{p.tipo==='porcentaje'?`${p.valor}%`:`R$${p.valor}`}</span>
            <span>{p.usos_actuales}/{p.usos_max||'∞'}</span>
            <span style={{fontSize:'10px',color:'rgba(0,0,0,.5)'}}>{p.expira_at?new Date(p.expira_at).toLocaleDateString('pt-BR'):'—'}</span>
            <span style={S.pill(p.activo?'g':'r')}>{p.activo?'activo':'inactivo'}</span>
            <div style={{display:'flex',gap:'4px'}}>
              <button style={S.btn('s')} onClick={() => { setForm({...p,valor:String(p.valor),usos_max:p.usos_max||'',expira_at:p.expira_at?p.expira_at.split('T')[0]:'',categoria_id:p.categoria_id||''}); setModal(p.id); }}>Editar</button>
              <button style={S.btn(p.activo?'d':'p')} onClick={() => toggle(p.id, !p.activo)}>{p.activo?'Desact.':'Activar'}</button>
            </div>
          </div>
        ))}
        {!promos.length && <div style={{padding:'24px',textAlign:'center',color:'rgba(0,0,0,.3)',fontSize:'10px'}}>Sin códigos promocionales</div>}
      </div>
      {modal && (
        <Modal title={modal==='new'?'Nuevo código promo':'Editar código'} onClose={() => setModal(null)}>
          <div style={S.grid2}>
            <div><div style={S.label}>Código</div><input style={{...S.input,textTransform:'uppercase'}} value={form.codigo} onChange={f('codigo')} placeholder="DESCUENTO20"/></div>
            <div><div style={S.label}>Tipo</div><select style={S.select} value={form.tipo} onChange={f('tipo')}><option value="porcentaje">Porcentaje (%)</option><option value="fijo">Monto fijo (R$)</option></select></div>
            <div><div style={S.label}>{form.tipo==='porcentaje'?'Descuento (%)':'Monto (R$)'}</div><input style={S.input} type="number" value={form.valor} onChange={f('valor')}/></div>
            <div><div style={S.label}>Máx. usos</div><input style={S.input} type="number" value={form.usos_max} onChange={f('usos_max')} placeholder="Ilimitado"/></div>
            <div><div style={S.label}>Expira el</div><input style={S.input} type="date" value={form.expira_at} onChange={f('expira_at')}/></div>
            <div><div style={S.label}>Categoría (opcional)</div><select style={S.select} value={form.categoria_id} onChange={f('categoria_id')}><option value="">Todas</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}</select></div>
            <div style={S.grid2}>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}><input type="checkbox" id="prim" checked={form.solo_primer_servicio} onChange={f('solo_primer_servicio')}/><label htmlFor="prim" style={{fontSize:'10px'}}>Solo primer servicio</label></div>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}><input type="checkbox" id="pact" checked={form.activo} onChange={f('activo')}/><label htmlFor="pact" style={{fontSize:'10px'}}>Activo</label></div>
            </div>
          </div>
          <div style={{display:'flex',gap:'7px',marginTop:'12px'}}>
            <button style={S.btn()} onClick={async()=>{ await upsert(modal==='new'?form:{...form,id:modal}); setModal(null); }}>Guardar</button>
            <button style={S.btn('s')} onClick={()=>setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── RATINGS ──────────────────────────────────────────────────
export function SecRatings() {
  const { ratings, flag, removeRating } = useRatings();
  const [filter, setFilter] = useState<'todos'|'bajos'|'sospechosos'>('todos');

  const filtered = ratings.filter(r => {
    if (filter === 'bajos') return (r.rating_proveedor && r.rating_proveedor <= 2) || (r.rating_cliente && r.rating_cliente <= 2);
    return true;
  });

  const stars = (n: number|null) => n ? '★'.repeat(Math.round(n)) + '☆'.repeat(5-Math.round(n)) : '—';

  return (
    <div style={S.wrap}>
      <div style={S.title}>Gestión de ratings</div>
      <div style={S.tabRow}>
        {(['todos','bajos','sospechosos'] as const).map(t => (
          <button key={t} style={S.tab(filter===t)} onClick={()=>setFilter(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </div>
      <div style={{background:'#FFFFFF',border:'1px solid rgba(0,0,0,.1)',borderRadius:'12px',overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 0.8fr 0.8fr 1fr',padding:'8px 12px',background:'rgba(0,0,0,.04)',borderBottom:'1px solid rgba(0,0,0,.1)',fontSize:'8px',textTransform:'uppercase',letterSpacing:'.8px',color:'rgba(0,0,0,.5)'}}>
          <span>Servicio</span><span>Cliente</span><span>Proveedor</span><span>Rating prov</span><span>Rating cli</span><span>Acciones</span>
        </div>
        {filtered.slice(0,30).map((r,i) => (
          <div key={r.id||i} style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 0.8fr 0.8fr 1fr',padding:'8px 12px',borderBottom:'1px solid rgba(0,0,0,.08)',alignItems:'center',fontSize:'10px'}}>
            <span style={{color:'rgba(0,0,0,.6)'}}>{r.categoria} · {r.id?.slice(0,8)}</span>
            <span>{r.cliente}</span>
            <span>{r.proveedor}</span>
            <span style={{color:r.rating_proveedor<=2?'#E11900':r.rating_proveedor>=5?'#06C167':'#F4F4F4'}}>{stars(r.rating_proveedor)}</span>
            <span style={{color:r.rating_cliente<=2?'#E11900':r.rating_cliente>=5?'#06C167':'#F4F4F4'}}>{stars(r.rating_cliente)}</span>
            <div style={{display:'flex',gap:'4px'}}>
              <button style={S.btn('d')} onClick={()=>removeRating(r.id,'rating_proveedor')}>✕ prov</button>
              <button style={S.btn('s')} onClick={()=>flag(r.id,'proveedor','Revisión manual')}>⚑ Flag</button>
            </div>
          </div>
        ))}
        {!filtered.length && <div style={{padding:'24px',textAlign:'center',color:'rgba(0,0,0,.3)',fontSize:'10px'}}>Sin ratings</div>}
      </div>
    </div>
  );
}

// ── AVANZADO (mega-sección con tabs) ─────────────────────────
type AdvTab = 'surge'|'horarios'|'onboarding'|'roles'|'hugo'|'integraciones'|'fraude'|'templates'|'referidos';

function TabSurge() {
  const { rules, upsert, toggle } = useSurge();
  const empty = { nombre:'', multiplicador:'1.5', hora_inicio:'', hora_fin:'', dias:['lun','mar','mie','jue','vie'], zona:'global', activo:true };
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState(empty);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
        <span style={{fontSize:'11px',color:'rgba(0,0,0,.6)'}}>Multiplicadores de precio dinámico por hora/zona</span>
        <button style={S.btn()} onClick={()=>{ setForm(empty); setModal('new'); }}>+ Nueva regla</button>
      </div>
      {rules.map(r => (
        <div key={r.id} style={{...S.card,display:'flex',alignItems:'center',gap:'10px',marginBottom:'7px'}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,marginBottom:'3px'}}>{r.nombre}</div>
            <div style={{fontSize:'10px',color:'rgba(0,0,0,.5)'}}>{r.hora_inicio||'00:00'}–{r.hora_fin||'24:00'} · {r.dias?.join(', ')} · zona: {r.zona}</div>
          </div>
          <div style={{fontSize:'20px',fontWeight:800,color:'#FFC043'}}>×{r.multiplicador}</div>
          <div style={{display:'flex',gap:'5px'}}>
            <button style={S.btn('s')} onClick={()=>{ setForm({...r,multiplicador:String(r.multiplicador),dias:r.dias||[]}); setModal(r.id); }}>Editar</button>
            <button style={S.btn(r.activo?'d':'p')} onClick={()=>toggle(r.id,!r.activo)}>{r.activo?'Desact.':'Activar'}</button>
          </div>
        </div>
      ))}
      {modal && (
        <Modal title="Regla de surge" onClose={()=>setModal(null)}>
          <div style={S.grid2}>
            <div style={{gridColumn:'1/-1'}}><div style={S.label}>Nombre</div><input style={S.input} value={form.nombre} onChange={f('nombre')} placeholder="Ej: Hora pico tarde"/></div>
            <div><div style={S.label}>Multiplicador</div><input style={S.input} type="number" step="0.1" value={form.multiplicador} onChange={f('multiplicador')}/></div>
            <div><div style={S.label}>Zona</div><input style={S.input} value={form.zona} onChange={f('zona')} placeholder="global"/></div>
            <div><div style={S.label}>Hora inicio</div><input style={S.input} type="time" value={form.hora_inicio} onChange={f('hora_inicio')}/></div>
            <div><div style={S.label}>Hora fin</div><input style={S.input} type="time" value={form.hora_fin} onChange={f('hora_fin')}/></div>
            <div style={{gridColumn:'1/-1'}}>
              <div style={S.label}>Días activos</div>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'4px'}}>
                {DIAS.map(d => (
                  <label key={d} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'10px',cursor:'pointer'}}>
                    <input type="checkbox" checked={form.dias.includes(d)} onChange={e=>setForm(p=>({...p,dias:e.target.checked?[...p.dias,d]:p.dias.filter(x=>x!==d)}))}/>
                    {d}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:'7px',marginTop:'12px'}}>
            <button style={S.btn()} onClick={async()=>{ await upsert(modal==='new'?form:{...form,id:modal}); setModal(null); }}>Guardar</button>
            <button style={S.btn('s')} onClick={()=>setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function TabHorarios() {
  const { horarios, update } = useHorarios();
  const [editing, setEditing] = useState<Record<string,any>>({});
  return (
    <>
      <div style={{fontSize:'11px',color:'rgba(0,0,0,.6)',marginBottom:'10px'}}>Horario de operación por día de la semana</div>
      {DIAS.map(dia => {
        const h = horarios.find(x => x.dia === dia);
        const ed = editing[dia] || {};
        return (
          <div key={dia} style={{...S.row,gap:'12px'}}>
            <div style={{width:'40px',fontWeight:700,fontSize:'11px',textTransform:'uppercase'}}>{dia}</div>
            <input type="time" style={{...S.input,width:'100px'}} defaultValue={h?.apertura||'07:00'} onChange={e=>setEditing(p=>({...p,[dia]:{...p[dia],apertura:e.target.value}}))}/>
            <span style={{color:'rgba(0,0,0,.45)'}}>→</span>
            <input type="time" style={{...S.input,width:'100px'}} defaultValue={h?.cierre||'22:00'} onChange={e=>setEditing(p=>({...p,[dia]:{...p[dia],cierre:e.target.value}}))}/>
            <label style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'10px',cursor:'pointer'}}>
              <input type="checkbox" defaultChecked={h?.activo!==false} onChange={e=>setEditing(p=>({...p,[dia]:{...p[dia],activo:e.target.checked}}))}/>
              Activo
            </label>
            <button style={S.btn()} onClick={()=>{
              const vals = { apertura: ed.apertura||h?.apertura||'07:00', cierre: ed.cierre||h?.cierre||'22:00', activo: ed.activo!==undefined?ed.activo:h?.activo!==false };
              update(dia, vals.apertura, vals.cierre, vals.activo);
            }}>Guardar</button>
          </div>
        );
      })}
    </>
  );
}

function TabOnboarding() {
  const { docs, upsert, remove } = useOnboarding();
  const { categorias } = useCategorias();
  const [sel, setSel] = useState('');
  const [form, setForm] = useState({ tipo_doc:'', descripcion:'', obligatorio:true, orden:'0' });
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.type==='checkbox'?e.target.checked:e.target.value }));
  const catDocs = docs.filter(d => d.categoria_id === sel);

  return (
    <>
      <div style={{fontSize:'11px',color:'rgba(0,0,0,.6)',marginBottom:'10px'}}>Documentos requeridos por categoría de servicio</div>
      <div style={{marginBottom:'10px'}}>
        <div style={S.label}>Categoría</div>
        <select style={{...S.select,maxWidth:'300px'}} value={sel} onChange={e=>setSel(e.target.value)}>
          <option value="">Seleccionar categoría...</option>
          {categorias.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>)}
        </select>
      </div>
      {sel && (
        <>
          <div style={{...S.card,marginBottom:'10px'}}>
            <div style={S.label}>Agregar documento requerido</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px 60px auto',gap:'8px',alignItems:'end',marginTop:'6px'}}>
              <input style={S.input} value={form.tipo_doc} onChange={f('tipo_doc')} placeholder="Tipo (ej: CPF, CNH, Antecedentes)"/>
              <input style={S.input} value={form.descripcion} onChange={f('descripcion')} placeholder="Descripción"/>
              <input style={S.input} type="number" value={form.orden} onChange={f('orden')} placeholder="Orden"/>
              <label style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'10px'}}><input type="checkbox" checked={form.obligatorio} onChange={f('obligatorio')}/>Oblig.</label>
              <button style={S.btn()} onClick={async()=>{ await upsert(sel,form.tipo_doc,form.descripcion,form.obligatorio,Number(form.orden)); setForm({tipo_doc:'',descripcion:'',obligatorio:true,orden:'0'}); }}>+</button>
            </div>
          </div>
          {catDocs.map(d => (
            <div key={d.id} style={{...S.row}}>
              <span style={{width:'20px',color:'rgba(0,0,0,.45)',fontSize:'10px'}}>{d.orden}</span>
              <span style={{flex:1,fontWeight:600}}>{d.tipo_doc}</span>
              <span style={{flex:2,fontSize:'10px',color:'rgba(0,0,0,.5)'}}>{d.descripcion}</span>
              <span style={S.pill(d.obligatorio?'r':'g')}>{d.obligatorio?'obligatorio':'opcional'}</span>
              <button style={S.btn('d')} onClick={()=>remove(d.id)}>✕</button>
            </div>
          ))}
          {!catDocs.length && <div style={{padding:'16px',textAlign:'center',color:'rgba(0,0,0,.3)',fontSize:'10px'}}>Sin documentos configurados para esta categoría</div>}
        </>
      )}
    </>
  );
}

function TabRoles() {
  const { roles, upsert, toggle } = useAdminRoles();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ email:'', nombre:'', permisos: [] as string[] });
  return (
    <>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
        <span style={{fontSize:'11px',color:'rgba(0,0,0,.6)'}}>Sub-admins con permisos limitados</span>
        <button style={S.btn()} onClick={()=>{ setForm({email:'',nombre:'',permisos:[]}); setModal(true); }}>+ Agregar admin</button>
      </div>
      {roles.map(r => (
        <div key={r.id} style={{...S.card,display:'flex',alignItems:'center',gap:'10px',marginBottom:'7px'}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700}}>{r.nombre}</div>
            <div style={{fontSize:'10px',color:'rgba(0,0,0,.5)',marginTop:'2px'}}>{r.email}</div>
            <div style={{display:'flex',gap:'4px',marginTop:'5px',flexWrap:'wrap'}}>
              {r.permisos?.map((p: string) => <span key={p} style={S.pill('g')}>{p}</span>)}
            </div>
          </div>
          <button style={S.btn(r.activo?'d':'p')} onClick={()=>toggle(r.id,!r.activo)}>{r.activo?'Revocar':'Activar'}</button>
        </div>
      ))}
      {!roles.length && <div style={{padding:'24px',textAlign:'center',color:'rgba(0,0,0,.3)',fontSize:'10px'}}>Sin sub-admins configurados</div>}
      {modal && (
        <Modal title="Nuevo sub-admin" onClose={()=>setModal(false)}>
          <div style={{marginBottom:'9px'}}><div style={S.label}>Email</div><input style={S.input} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="email@ejemplo.com"/></div>
          <div style={{marginBottom:'9px'}}><div style={S.label}>Nombre</div><input style={S.input} value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Nombre del admin"/></div>
          <div style={S.label}>Permisos</div>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'5px',marginBottom:'12px'}}>
            {PERMISOS_OPTS.map(p=>(
              <label key={p} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'10px',cursor:'pointer',padding:'4px 8px',background:'rgba(0,0,0,.04)',borderRadius:'20px'}}>
                <input type="checkbox" checked={form.permisos.includes(p)} onChange={e=>setForm(prev=>({...prev,permisos:e.target.checked?[...prev.permisos,p]:prev.permisos.filter(x=>x!==p)}))}/>
                {p}
              </label>
            ))}
          </div>
          <div style={{display:'flex',gap:'7px'}}>
            <button style={S.btn()} onClick={async()=>{ await upsert(form.email,form.nombre,form.permisos); setModal(false); }}>Crear</button>
            <button style={S.btn('s')} onClick={()=>setModal(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function TabHugo() {
  const { config, update, getAll } = useAdvancedConfig('hugo_prompt_');
  const [full, setFull] = useState<any[]>([]);
  const [editing, setEditing] = useState<Record<string,string>>({});
  useEffect(() => { getAll().then(setFull); }, [getAll]);
  return (
    <>
      <div style={{fontSize:'11px',color:'rgba(0,0,0,.6)',marginBottom:'10px'}}>Editar los system prompts de Hugo por rol. Los cambios aplican en el próximo mensaje.</div>
      {full.map(item => (
        <div key={item.clave} style={{...S.card,marginBottom:'10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
            <span style={{fontWeight:700,color:'#05944F',textTransform:'uppercase',fontSize:'10px'}}>{item.clave.replace('hugo_prompt_','')}</span>
            <span style={{fontSize:'9px',color:'rgba(0,0,0,.35)'}}>{item.descripcion}</span>
          </div>
          <textarea
            style={{...S.input,minHeight:'90px',resize:'vertical',fontFamily:'monospace',fontSize:'10px',lineHeight:'1.5'}}
            defaultValue={item.valor}
            onChange={e=>setEditing(p=>({...p,[item.clave]:e.target.value}))}
          />
          <div style={{marginTop:'7px'}}>
            <button style={S.btn()} onClick={()=>update(item.clave, editing[item.clave]||item.valor)}>Guardar prompt</button>
          </div>
        </div>
      ))}
    </>
  );
}

function TabIntegraciones() {
  const { config, update, getAll } = useAdvancedConfig('integration_');
  const [full, setFull] = useState<any[]>([]);
  const [vals, setVals] = useState<Record<string,string>>({});
  useEffect(() => { getAll().then(d=>{ setFull(d); const m:Record<string,string>={}; d.forEach((r:any)=>m[r.clave]=r.valor); setVals(m); }); }, [getAll]);
  return (
    <>
      <div style={{fontSize:'11px',color:'rgba(0,0,0,.6)',marginBottom:'10px'}}>Credenciales de servicios externos. Los valores se guardan cifrados.</div>
      {full.map(item => (
        <div key={item.clave} style={{...S.row}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:'11px'}}>{item.descripcion}</div>
            <div style={{fontSize:'9px',color:'rgba(0,0,0,.45)',marginTop:'2px'}}>{item.clave}</div>
          </div>
          <input
            style={{...S.input,width:'260px',fontFamily:'monospace'}}
            type="password"
            value={vals[item.clave]||''}
            placeholder="Pegar clave aquí..."
            onChange={e=>setVals(p=>({...p,[item.clave]:e.target.value}))}
          />
          <button style={S.btn()} onClick={()=>update(item.clave,vals[item.clave]||'')}>Guardar</button>
        </div>
      ))}
    </>
  );
}

function TabFraude() {
  const { config, update, getAll } = useAdvancedConfig('fraude_');
  const [full, setFull] = useState<any[]>([]);
  const [vals, setVals] = useState<Record<string,string>>({});
  useEffect(() => { getAll().then(d=>{ setFull(d); const m:Record<string,string>={}; d.forEach((r:any)=>m[r.clave]=r.valor); setVals(m); }); }, [getAll]);
  return (
    <>
      <div style={{fontSize:'11px',color:'rgba(0,0,0,.6)',marginBottom:'10px'}}>Reglas automáticas de detección de fraude. Hugo monitorea estas condiciones en tiempo real.</div>
      {full.map(item => (
        <div key={item.clave} style={{...S.row}}>
          <div style={{flex:2}}>
            <div style={{fontWeight:600,fontSize:'11px'}}>{item.descripcion}</div>
            <div style={{fontSize:'9px',color:'rgba(0,0,0,.45)',marginTop:'2px'}}>{item.clave}</div>
          </div>
          <input style={{...S.input,width:'80px',textAlign:'center'}} value={vals[item.clave]||''} onChange={e=>setVals(p=>({...p,[item.clave]:e.target.value}))}/>
          <button style={S.btn()} onClick={()=>update(item.clave,vals[item.clave]||'')}>Guardar</button>
        </div>
      ))}
    </>
  );
}

function TabTemplates() {
  const { config, update, getAll } = useAdvancedConfig('template_');
  const [full, setFull] = useState<any[]>([]);
  const [vals, setVals] = useState<Record<string,string>>({});
  useEffect(() => { getAll().then(d=>{ setFull(d); const m:Record<string,string>={}; d.forEach((r:any)=>m[r.clave]=r.valor); setVals(m); }); }, [getAll]);
  return (
    <>
      <div style={{fontSize:'11px',color:'rgba(0,0,0,.6)',marginBottom:'10px'}}>Templates de mensajes. Variables disponibles: {'{{nombre}}'}, {'{{categoria}}'}, {'{{proveedor}}'}, {'{{eta}}'}, {'{{numero}}'}.</div>
      {full.map(item => (
        <div key={item.clave} style={{...S.card,marginBottom:'10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
            <span style={{fontWeight:700,fontSize:'10px'}}>{item.descripcion}</span>
            <span style={{fontSize:'9px',color:'rgba(0,0,0,.35)'}}>{item.clave}</span>
          </div>
          <textarea style={{...S.input,minHeight:'60px',resize:'vertical',fontFamily:'monospace',fontSize:'10px'}} value={vals[item.clave]||''} onChange={e=>setVals(p=>({...p,[item.clave]:e.target.value}))}/>
          <div style={{marginTop:'6px'}}><button style={S.btn()} onClick={()=>update(item.clave,vals[item.clave]||'')}>Guardar template</button></div>
        </div>
      ))}
    </>
  );
}

function TabReferidos() {
  const { config, update, getAll } = useAdvancedConfig('referido_');
  const [full, setFull] = useState<any[]>([]);
  const [vals, setVals] = useState<Record<string,string>>({});
  useEffect(() => { getAll().then(d=>{ setFull(d); const m:Record<string,string>={}; d.forEach((r:any)=>m[r.clave]=r.valor); setVals(m); }); }, [getAll]);
  return (
    <>
      <div style={{fontSize:'11px',color:'rgba(0,0,0,.6)',marginBottom:'10px'}}>Configuración del programa de referidos. Los bonos se acreditan automáticamente via escrow.</div>
      {full.map(item => (
        <div key={item.clave} style={{...S.row}}>
          <div style={{flex:2}}>
            <div style={{fontWeight:600,fontSize:'11px'}}>{item.descripcion}</div>
            <div style={{fontSize:'9px',color:'rgba(0,0,0,.45)',marginTop:'2px'}}>{item.clave}</div>
          </div>
          {item.clave === 'referido_activo' ? (
            <label style={{display:'flex',alignItems:'center',gap:'7px',fontSize:'11px',cursor:'pointer'}}>
              <input type="checkbox" checked={vals[item.clave]==='true'} onChange={e=>{ const v=String(e.target.checked); setVals(p=>({...p,[item.clave]:v})); update(item.clave,v); }}/>
              {vals[item.clave]==='true'?'Programa activo':'Programa inactivo'}
            </label>
          ) : (
            <>
              <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                <span style={{color:'rgba(0,0,0,.45)',fontSize:'11px'}}>R$</span>
                <input style={{...S.input,width:'80px',textAlign:'center'}} value={vals[item.clave]||''} onChange={e=>setVals(p=>({...p,[item.clave]:e.target.value}))}/>
              </div>
              <button style={S.btn()} onClick={()=>update(item.clave,vals[item.clave]||'')}>Guardar</button>
            </>
          )}
        </div>
      ))}
    </>
  );
}

const SBv_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SBv_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';

export function SecValidacionPaises() {
  const [paises, setPaises] = React.useState<any[]>([]);
  const [sel, setSel] = React.useState<any>(null);

  React.useEffect(() => {
    fetch(`${SBv_URL}/rest/v1/config_validacion_pais?select=*&order=pais`,
      {headers:{apikey:SBv_KEY,Authorization:`Bearer ${SBv_KEY}`}})
      .then(r=>r.json()).then(data => { if(Array.isArray(data)) setPaises(data); });
  }, []);

  const toggle = async (id: string, activo: boolean) => {
    await fetch(`${SBv_URL}/rest/v1/config_validacion_pais?id=eq.${id}`,
      {method:'PATCH',headers:{apikey:SBv_KEY,Authorization:`Bearer ${SBv_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({activo})});
    setPaises(p => p.map(x => x.id===id ? {...x,activo} : x));
  };

  return (
    <div className="pad">
      <div className="st">🌎 Validación KYC por País</div>
      <div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:'12px',height:'calc(100% - 60px)'}}>
        {/* Lista de países */}
        <div className="tw" style={{height:'fit-content'}}>
          {paises.map(p => (
            <div key={p.id} onClick={()=>setSel(p)}
              style={{padding:'10px 13px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:sel?.id===p.id?'rgba(5,148,79,.05)':'#FFF',display:'flex',alignItems:'center',gap:'9px',transition:'background .1s'}}>
              <span style={{fontSize:'18px'}}>{{'BR':'🇧🇷','AR':'🇦🇷','CL':'🇨🇱','CO':'🇨🇴','MX':'🇲🇽','UY':'🇺🇾'}[p.codigo_iso]||'🌐'}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:'12px',fontWeight:700}}>{p.pais}</div>
                <div style={{fontSize:'10px',color:'var(--muted)'}}>{p.docs_requeridos?.join(', ')}</div>
              </div>
              <button onClick={e=>{e.stopPropagation();toggle(p.id,!p.activo);}}
                style={{padding:'2px 8px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'9px',fontWeight:700,
                  background:p.activo?'rgba(5,148,79,.1)':'rgba(0,0,0,.06)',color:p.activo?'#05944F':'#888'}}>
                {p.activo?'● ON':'○ OFF'}
              </button>
            </div>
          ))}
        </div>
        {/* Detalle del país seleccionado */}
        {sel ? (
          <div className="tw" style={{padding:'16px',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
              <span style={{fontSize:'28px'}}>{{'BR':'🇧🇷','AR':'🇦🇷','CL':'🇨🇱','CO':'🇨🇴','MX':'🇲🇽','UY':'🇺🇾'}[sel.codigo_iso]||'🌐'}</span>
              <div>
                <div style={{fontWeight:800,fontSize:'16px'}}>{sel.pais}</div>
                <div style={{fontSize:'11px',color:'var(--muted)'}}>ISO: {sel.codigo_iso} · Docs: {sel.docs_requeridos?.join(', ')}</div>
              </div>
            </div>
            {Object.entries((sel.reglas_ocr?.docs||{})).map(([tipo, cfg]: any) => (
              <div key={tipo} style={{background:'var(--bg)',borderRadius:'12px',padding:'12px',marginBottom:'10px'}}>
                <div style={{fontWeight:700,fontSize:'12px',marginBottom:'3px'}}>{tipo} — {cfg.nombre_completo}</div>
                {cfg.formato_regex && <div style={{fontSize:'10px',color:'var(--muted)',fontFamily:'monospace',marginBottom:'5px'}}>Regex: {cfg.formato_regex}</div>}
                {cfg.digitos && <div style={{fontSize:'10px',color:'var(--muted)',marginBottom:'5px'}}>Dígitos: {cfg.digitos}</div>}
                <div style={{fontSize:'11px',color:'#444',lineHeight:1.5,background:'#FFF',borderRadius:'8px',padding:'8px'}}>{cfg.prompt_gemini}</div>
              </div>
            ))}
            <div style={{fontSize:'11px',color:'var(--muted)',fontStyle:'italic',marginTop:'8px'}}>{sel.reglas_ocr?.nota_cultural}</div>
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:'13px'}}>
            Seleccioná un país para ver la configuración de validación
          </div>
        )}
      </div>
    </div>
  );
}

export function SecAvanzado() {
  const [tab, setTab] = useState<AdvTab>('surge');
  const TABS: { id: AdvTab; label: string }[] = [
    { id:'surge',       label:'⚡ Surge' },
    { id:'horarios',    label:'🕐 Horarios' },
    { id:'onboarding',  label:'📋 Onboarding' },
    { id:'roles',       label:'👤 Roles Admin' },
    { id:'hugo',        label:'🤖 Hugo Config' },
    { id:'integraciones',label:'🔌 Integraciones' },
    { id:'fraude',      label:'🛡 Fraude' },
    { id:'templates',   label:'✉️ Templates' },
    { id:'referidos',   label:'🎁 Referidos' },
  ];
  return (
    <div style={S.wrap}>
      <div style={S.title}>Configuración avanzada</div>
      <div style={{...S.tabRow,flexWrap:'wrap',gap:'0'}}>
        {TABS.map(t => <button key={t.id} style={S.tab(tab===t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>)}
      </div>
      <div>
        {tab === 'surge'        && <TabSurge/>}
        {tab === 'horarios'     && <TabHorarios/>}
        {tab === 'onboarding'   && <TabOnboarding/>}
        {tab === 'roles'        && <TabRoles/>}
        {tab === 'hugo'         && <TabHugo/>}
        {tab === 'integraciones'&& <TabIntegraciones/>}
        {tab === 'fraude'       && <TabFraude/>}
        {tab === 'templates'    && <TabTemplates/>}
        {tab === 'referidos'    && <TabReferidos/>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SecImportProviders — Import CSV / Excel
───────────────────────────────────────────── */
const SB_IMP_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_IMP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';

function parseCSV(text: string): Record<string,string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,'').toLowerCase());
  return lines.slice(1).map(line => {
    // Handle quoted CSV
    const vals: string[] = [];
    let cur = '', inQ = false;
    for (const ch of line + ',') {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    return Object.fromEntries(headers.map((h,i) => [h, vals[i] || '']));
  }).filter(r => Object.values(r).some(v => v));
}

export function SecImportProviders() {
  const [rows, setRows] = React.useState<Record<string,string>[]>([]);
  const [status, setStatus] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ok:number,err:number,errores:string[]}|null>(null);
  const [dragging, setDragging] = React.useState(false);

  const processFile = (file: File) => {
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) { setStatus('❌ Archivo vacío'); return; }
      const parsed = parseCSV(text);
      setRows(parsed);
      setStatus(`✅ ${parsed.length} filas cargadas. Revisá la vista previa y hacé clic en Importar.`);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const doImport = async () => {
    if (!rows.length) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${SB_IMP_URL}/functions/v1/import-providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SB_IMP_KEY}` },
        body: JSON.stringify({ proveedores: rows })
      });
      const d = await r.json();
      setResult(d);
      setStatus(`Importación completa: ${d.ok} exitosos, ${d.err} con error.`);
    } catch(e: any) {
      setStatus('❌ Error: ' + e.message);
    } finally { setLoading(false); }
  };

  const preview = rows.slice(0, 5);
  const cols = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="pad" style={{overflowY:'auto',height:'calc(100% - 40px)'}}>
      <div className="st">📥 Importar Proveedores (CSV)</div>
      <p style={{fontSize:'12px',color:'var(--muted)',marginBottom:'16px',lineHeight:1.6}}>
        Subí un archivo CSV con los datos de los proveedores. Columnas reconocidas:<br/>
        <code style={{background:'#f5f5f5',padding:'2px 6px',borderRadius:'4px',fontSize:'11px'}}>
          nombre, email, categoria, telefono, zona, tarifa_base, bio, lat, lng, pais, activo
        </code>
      </p>

      {/* Drop Zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={onDrop}
        onClick={()=>document.getElementById('csvfile')?.click()}
        style={{border:`2px dashed ${dragging?'var(--primary)':'#ddd'}`,borderRadius:'16px',padding:'32px',textAlign:'center',cursor:'pointer',marginBottom:'16px',background:dragging?'rgba(5,148,79,.03)':'#fafafa',transition:'all .2s'}}>
        <div style={{fontSize:'32px',marginBottom:'8px'}}>📄</div>
        <div style={{fontWeight:700,fontSize:'14px'}}>Arrastrá tu CSV aquí</div>
        <div style={{fontSize:'12px',color:'var(--muted)',marginTop:'4px'}}>o hacé clic para seleccionar</div>
        <input id="csvfile" type="file" accept=".csv,.txt" style={{display:'none'}} onChange={onFile}/>
      </div>

      {/* Download template */}
      <a
        href="data:text/csv;charset=utf-8,nombre,email,categoria,telefono,zona,tarifa_base,bio,lat,lng,pais%0AJuan Garcia,juan@email.com,Electricista,+55489999-9999,Centro,90,Electricista con 10 años de experiencia,-27.5969,-48.5495,BR"
        download="template_proveedores.csv"
        style={{fontSize:'12px',color:'var(--primary)',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'4px',marginBottom:'16px'}}>
        ⬇ Descargar plantilla CSV
      </a>

      {status && (
        <div style={{padding:'10px 14px',background:status.startsWith('❌')?'#fef2f2':'#f0fdf4',borderRadius:'10px',fontSize:'13px',marginBottom:'16px',color:status.startsWith('❌')?'#dc2626':'#166534'}}>
          {status}
        </div>
      )}

      {result && result.errores?.length > 0 && (
        <div style={{background:'#fef2f2',borderRadius:'10px',padding:'10px 14px',marginBottom:'16px'}}>
          <div style={{fontWeight:700,fontSize:'12px',color:'#dc2626',marginBottom:'4px'}}>Errores:</div>
          {result.errores.map((e,i) => <div key={i} style={{fontSize:'11px',color:'#dc2626'}}>• {e}</div>)}
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <>
          <div style={{fontWeight:700,fontSize:'13px',marginBottom:'8px'}}>Vista previa ({rows.length} filas)</div>
          <div style={{overflowX:'auto',marginBottom:'16px',borderRadius:'12px',border:'1px solid var(--border)'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
              <thead>
                <tr style={{background:'#f5f5f5'}}>
                  {cols.map(c=><th key={c} style={{padding:'8px 10px',textAlign:'left',fontWeight:700,borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #f5f5f5'}}>
                    {cols.map(c=><td key={c} style={{padding:'7px 10px',maxWidth:'120px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row[c]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && <div style={{padding:'8px 10px',fontSize:'11px',color:'var(--muted)'}}>... y {rows.length-5} filas más</div>}
          </div>

          <button
            onClick={doImport}
            disabled={loading}
            style={{width:'100%',padding:'13px',background:loading?'#ccc':'#111',color:'#fff',fontWeight:800,fontSize:'14px',border:'none',borderRadius:'13px',cursor:loading?'not-allowed':'pointer',fontFamily:'inherit'}}>
            {loading ? '⏳ Importando...' : `📥 Importar ${rows.length} proveedores`}
          </button>
        </>
      )}
    </div>
  );
}
