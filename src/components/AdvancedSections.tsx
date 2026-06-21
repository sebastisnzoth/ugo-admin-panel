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
   SecImportProviders — CSV/Excel + inserción Supabase directa
   Formato: prospectos_scouts o genérico con auto-mapeo
───────────────────────────────────────────── */
import * as XLSX from 'xlsx';

const SB_IMP_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_IMP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';

// Categorías válidas
const CATS_VALID = ['electricista','plomero','limpeza','pintura','carpintaria','jardinagem','climatizacao','ti_redes','reformas','chaveiro'];

function normalizeCategory(raw: string): string {
  const k = (raw||'').toLowerCase().trim();
  if (CATS_VALID.includes(k)) return k;
  const map: Record<string,string> = {
    'limpeza':'limpeza','limpieza':'limpeza','cleaning':'limpeza','faxina':'limpeza',
    'eletricista':'electricista','electrician':'electricista','elétrica':'electricista',
    'encanador':'plomero','hidráulica':'plomero','plumbing':'plomero',
    'pintor':'pintura','painter':'pintura','pintura':'pintura',
    'carpinteiro':'carpintaria','marcenaria':'carpintaria','carpenter':'carpintaria',
    'chaveiro':'chaveiro','locksmith':'chaveiro',
    'jardineiro':'jardinagem','gardener':'jardinagem','garden':'jardinagem',
    'ar condicionado':'climatizacao','hvac':'climatizacao','climatização':'climatizacao',
    'informática':'ti_redes','computer':'ti_redes','assistência técnica':'ti_redes',
    'reforma':'reformas','pedreiro':'reformas','construção':'reformas',
  };
  for (const [k2,v] of Object.entries(map)) { if (k.includes(k2)) return v; }
  return raw || 'reformas';
}

// Detectar categoría desde el nombre cuando no hay columna categoria
function detectCatFromName(name: string): string {
  const n = name.toLowerCase();
  if (/eletric|electr|elétric/.test(n))              return 'electricista';
  if (/encanad|hidráulic|plomero|plumb/.test(n))     return 'plomero';
  if (/limpez|faxin|limpador|clean/.test(n))         return 'limpeza';
  if (/chaveiro|locksmith|fechadura/.test(n))        return 'chaveiro';
  if (/pintor|pintura|painter/.test(n))              return 'pintura';
  if (/carpint|marcen|carpenter/.test(n))            return 'carpintaria';
  if (/jardin|paisag|garden/.test(n))               return 'jardinagem';
  if (/ar condic|climatiz|refriger|hvac/.test(n))    return 'climatizacao';
  if (/informátic|computad|assist.técn|ti |redes/.test(n)) return 'ti_redes';
  if (/reform|pedreiro|construct|obras/.test(n))     return 'reformas';
  return 'reformas';
}

function parseCSVRows(rawRows: Record<string,string>[]): Record<string,string>[] {
  return rawRows.map(r => {
    const n: Record<string,string> = {};
    for (const [k,v] of Object.entries(r)) n[k.toLowerCase().trim()] = String(v||'').trim();

    const nome     = n['nombre']   || n['name']     || n['nome']     || '';
    // Categoría: columna explícita > detección desde nombre
    const rawCat   = n['categoria'] || n['category'] || n['servico'] || '';
    const cat      = rawCat ? normalizeCategory(rawCat) : detectCatFromName(nome);
    const direccion= n['dir'] || n['direccion']|| n['address']   || n['endereco'] || '';
    const ciudad   = n['ciudad']   || n['city']      || n['municipio']|| 'Florianópolis';
    const pais     = n['pais']     || n['country']   || 'BR';
    // Teléfono: limpiar formato +55 48 99972-1743 → +5548999721743
    const telRaw   = n['tel'] || n['telefono']|| n['phone'] || n['telefone'] || '';
    const telefono = telRaw.replace(/[()\s-]/g,'').replace(/\*\*\*PRO\*\*\*/,'');
    const email    = n['email']    || '';
    const website  = n['website']  || n['site']      || n['url']      || '';
    // Lat/lng: si vienen en 0.0000 también se considera vacío
    const latRaw   = n['latitud']  || n['latitude']  || n['lat']      || '';
    const lngRaw   = n['longitud'] || n['longitude'] || n['lng']      || n['lon'] || '';
    const latitud  = latRaw && parseFloat(latRaw) !== 0 ? latRaw : '';
    const longitud = lngRaw && parseFloat(lngRaw) !== 0 ? lngRaw : '';
    const score    = n['score_confianza'] || n['rating'] || '50';
    const notas    = n['notas_hugo'] || n['notas'] || `Importado via CSV · ${cat}`;
    const fuente   = n['fuente']   || 'csv_import';

    return { nombre:nome, categoria:cat, direccion, ciudad, pais, telefono, email, website,
      latitud, longitud, score_confianza:score, notas_hugo:notas, fuente, estado:'prospecto_pendiente',
      _needs_geocode: (!latitud || !longitud) && direccion ? 'true' : 'false' };
  }).filter(r => r.nombre && r.nombre !== '***PRO***' && r.nombre.length > 1);
}

// Template CSV — formato exacto prospectos_scouts (mismo que exporta Scout)
const TEMPLATE_CSV = `id,nombre,categoria,direccion,ciudad,pais,telefono,email,website,rating,reviews_count,latitud,longitud,fuente,estado,fecha_prospectado,notas_hugo,score_confianza
,João Eletricista,electricista,"Rua das Flores 123, Centro",Florianópolis,Brasil,+55 48 99999-0001,joao@email.com,https://joao.com.br,,0,-27.5954000000,-48.5480000000,csv_import,prospecto_pendiente,2026-06-21 00:00:00,Especialista em instalações residenciais,70
,Maria Limpeza,limpeza,"Av. Hercílio Luz 456, Centro",Florianópolis,Brasil,+55 48 99999-0002,,,,,0,-27.6000000000,-48.5500000000,csv_import,prospecto_pendiente,2026-06-21 00:00:00,,65
`;

export function SecImportProviders() {
  const [rows, setRows]       = React.useState<Record<string,string>[]>([]);
  const [status, setStatus]   = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult]   = React.useState<{ok:number;dup:number;err:number;errList:string[]}|null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [destino, setDestino] = React.useState<'prospectos'|'usuarios'>('usuarios');
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  const processFile = (file: File) => {
    setResult(null); setRows([]); setSelected(new Set());
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string,string>>(ws, { defval: '' });
        if (!json.length) { setStatus('❌ Archivo vacío'); return; }
        const mapped = parseCSVRows(json);

        // Geocodificar filas sin lat/lng usando Nominatim
        const needsGeo = mapped.filter(r => r._needs_geocode === 'true').length;
        if (needsGeo > 0) {
          setStatus(`⏳ Geocodificando ${needsGeo} direcciones sin coordenadas (puede tardar ~${needsGeo}s)...`);
          for (let i = 0; i < mapped.length; i++) {
            if (mapped[i]._needs_geocode !== 'true') continue;
            try {
              const addr = encodeURIComponent(`${mapped[i].direccion}, ${mapped[i].ciudad}, Brasil`);
              const gr = await fetch(`https://nominatim.openstreetmap.org/search?q=${addr}&format=json&limit=1`, {
                headers: { 'User-Agent': 'ugo-scout-import/1.0' }
              });
              const gd = await gr.json();
              if (gd?.[0]) {
                mapped[i].latitud  = parseFloat(gd[0].lat).toFixed(6);
                mapped[i].longitud = parseFloat(gd[0].lon).toFixed(6);
              }
              await new Promise(res => setTimeout(res, 1100)); // rate limit Nominatim
            } catch { /* skip, sin coordenadas */ }
          }
        }

        setRows(mapped);
        setSelected(new Set(mapped.map((_,i) => i)));
        const geoOk = mapped.filter(r => r.latitud && r.longitud).length;
        setStatus(`✅ ${json.length} filas → ${mapped.length} válidos · ${geoOk} con coordenadas · ${needsGeo} geocodificados`);
      } catch(err: any) { setStatus('❌ Error: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((_,i) => i)));
  };
  const toggleRow = (i: number) => {
    const s = new Set(selected);
    s.has(i) ? s.delete(i) : s.add(i);
    setSelected(s);
  };

  const doImport = async () => {
    const toImport = rows.filter((_,i) => selected.has(i));
    if (!toImport.length) { setStatus('❌ Seleccioná al menos una fila'); return; }
    setLoading(true); setResult(null);

    const table = destino === 'prospectos' ? 'prospectos_scouts' : 'usuarios';
    let ok = 0, dup = 0, err = 0;
    const errList: string[] = [];

    // Insertar de a 1 para mejor control de errores (o lotes de 10)
    const BATCH = 10;
    const chunks: typeof toImport[] = [];
    for (let i = 0; i < toImport.length; i += BATCH) chunks.push(toImport.slice(i, i+BATCH));

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      setStatus(`⏳ Insertando lote ${ci+1}/${chunks.length}...`);

      try {
        const payload = destino === 'prospectos'
          ? chunk.map(r => ({
              nombre:          r.nombre            || '(sin nombre)',
              categoria:       r.categoria         || 'reformas',
              direccion:       r.direccion         || null,
              ciudad:          r.ciudad            || 'Florianópolis',
              pais:            r.pais              || 'BR',
              telefono:        r.telefono          || null,
              email:           r.email             || null,
              website:         r.website           || null,
              rating:          r.rating && parseFloat(r.rating) ? parseFloat(r.rating) : null,
              reviews_count:   r.reviews_count     ? parseInt(r.reviews_count) : 0,
              latitud:         r.latitud && parseFloat(r.latitud) !== 0 ? parseFloat(r.latitud) : null,
              longitud:        r.longitud && parseFloat(r.longitud) !== 0 ? parseFloat(r.longitud) : null,
              fuente:          r.fuente            || 'csv_import',
              estado:          'prospecto_pendiente',
              score_confianza: r.score_confianza   ? parseInt(r.score_confianza) : 50,
              notas_hugo:      r.notas_hugo        || 'Importado via CSV',
            }))
          : null; // usuarios usa RPC → se maneja abajo

        // ── USUARIOS: usa RPC SECURITY DEFINER (bypasea RLS) ──
        if (destino === 'usuarios') {
          const rpcRes = await fetch(`${SB_IMP_URL}/rest/v1/rpc/import_proveedores_csv`, {
            method: 'POST',
            headers: { 'Content-Type':'application/json','apikey':SB_IMP_KEY,'Authorization':`Bearer ${SB_IMP_KEY}` },
            body: JSON.stringify({ p_rows: chunk }),
          });
          const rpcD = await rpcRes.json();
          if (rpcRes.ok && rpcD.ok) {
            ok  += rpcD.insertados || 0;
            dup += rpcD.duplicados || 0;
            err += rpcD.errores    || 0;
            if (rpcD.detalle?.length) errList.push(...rpcD.detalle.map((e:string)=>`Lote ${ci+1}: ${e}`));
          } else {
            err += chunk.length;
            errList.push(`Lote ${ci+1}: ${rpcD.message || rpcD.error || rpcRes.status}`);
          }
          continue; // saltar el fetch REST abajo
        }

        const res = await fetch(`${SB_IMP_URL}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey':        SB_IMP_KEY,
            'Authorization': `Bearer ${SB_IMP_KEY}`,
            'Prefer':        'return=minimal,resolution=ignore-duplicates',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok || res.status === 201 || res.status === 204) {
          ok += chunk.length;
        } else if (res.status === 409) {
          dup += chunk.length;
        } else {
          let msg = `HTTP ${res.status}`;
          try {
            const d = await res.json();
            msg = d.message || d.details || d.error || msg;
          } catch {}
          err += chunk.length;
          errList.push(`Lote ${ci+1}: ${msg}`);
          console.error('[Import] Supabase error:', msg);
        }
      } catch(e: any) {
        err += chunk.length;
        errList.push(`Lote ${ci+1}: ${e.message}`);
      }
    }

    // Log
    await fetch(`${SB_IMP_URL}/rest/v1/import_logs`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json','apikey':SB_IMP_KEY,'Authorization':`Bearer ${SB_IMP_KEY}` },
      body: JSON.stringify({ tipo:`${destino}_csv`, total_filas:toImport.length, insertados:ok, duplicados:dup, errores:err, detalles:{errList} }),
    }).catch(()=>{});

    setResult({ ok, dup, err, errList });
    setStatus(err > 0
      ? `⚠️ ${ok} importados · ${dup} duplicados · ${err} errores → ver detalles`
      : `✅ ${ok} importados correctamente · ${dup} duplicados ignorados`);
    setLoading(false);
  };

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([TEMPLATE_CSV], {type:'text/csv'}));
    a.download = 'template_provedores_ugo.csv';
    a.click();
  };

  const preview = rows.slice(0, 6);

  return (
    <div className="pad" style={{overflowY:'auto',height:'calc(100% - 40px)'}}>
      <div className="st">📥 Importar Proveedores</div>
      <p style={{fontSize:'12px',color:'var(--muted)',marginBottom:'14px',lineHeight:1.6}}>
        Soporta CSV y Excel. Detecta automáticamente el formato. Compatible con el formato de exportación del Scout Radar.
      </p>

      <div style={{display:'flex',gap:'10px',marginBottom:'14px',flexWrap:'wrap',alignItems:'center'}}>
        <button onClick={downloadTemplate} style={{padding:'7px 14px',background:'rgba(0,0,0,.06)',border:'1px solid #ddd',borderRadius:'8px',fontSize:'11px',cursor:'pointer',fontFamily:'inherit'}}>
          ⬇ Descargar template CSV
        </button>
        <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
          <span style={{fontSize:'11px',color:'#666'}}>Destino:</span>
          {(['prospectos','usuarios'] as const).map(d => (
            <button key={d} onClick={()=>setDestino(d)}
              style={{padding:'5px 12px',border:'1.5px solid',borderColor:destino===d?'#05944F':'#ddd',borderRadius:'20px',fontSize:'10px',fontWeight:700,cursor:'pointer',background:destino===d?'rgba(5,148,79,.08)':'#fff',color:destino===d?'#05944F':'#666',fontFamily:'inherit'}}>
              {d==='prospectos'?'📋 Solo prospectos':'👤 Proveedores (recomendado)'}
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)processFile(f);}}
        onClick={()=>document.getElementById('imp-file')?.click()}
        style={{border:`2.5px dashed ${dragging?'#05944F':'#ddd'}`,borderRadius:'16px',padding:'28px',textAlign:'center',cursor:'pointer',marginBottom:'14px',background:dragging?'rgba(5,148,79,.04)':'#fafafa',transition:'all .2s'}}>
        <div style={{fontSize:'36px',marginBottom:'8px'}}>{dragging?'🎯':'📊'}</div>
        <div style={{fontWeight:700,fontSize:'14px',color:'#111'}}>Arrastrá tu archivo Excel o CSV aquí</div>
        <div style={{fontSize:'12px',color:'#888',marginTop:'4px'}}>.xlsx · .xls · .csv — o clic para seleccionar</div>
        <input id="imp-file" type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)processFile(f);}}/>
      </div>

      {status && (
        <div style={{padding:'10px 14px',background:status.startsWith('❌')?'#fef2f2':'#f0fdf4',borderRadius:'10px',fontSize:'13px',marginBottom:'14px',color:status.startsWith('❌')?'#dc2626':'#166534',lineHeight:1.5}}>
          {status}
        </div>
      )}

      {result && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'10px'}}>
            {([['Importados',result.ok,'#05944F'],['Duplicados',result.dup,'#996000'],['Errores',result.err,'#dc2626']] as [string,number,string][]).map(([l,v,col])=>(
              <div key={l} style={{background:'#f9f9f9',border:'1px solid #e5e5e5',borderRadius:'10px',padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:'22px',fontWeight:800,color:col}}>{v}</div>
                <div style={{fontSize:'10px',color:'#666'}}>{l}</div>
              </div>
            ))}
          </div>
          {result.errList.length > 0 && (
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'10px',padding:'10px 12px',marginBottom:'10px',fontSize:'11px',color:'#dc2626',lineHeight:1.6}}>
              <strong>Detalle de errores:</strong>
              {result.errList.map((e,i) => <div key={i}>• {e}</div>)}
            </div>
          )}
        </>
      )}

      {rows.length > 0 && (
        <>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px',gap:'10px',flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <input type="checkbox" checked={selected.size===rows.length} onChange={toggleAll} style={{width:'15px',height:'15px',cursor:'pointer'}}/>
              <div style={{fontWeight:700,fontSize:'13px'}}>{rows.length} proveedores — {selected.size} seleccionados</div>
            </div>
            <div style={{fontSize:'11px',color:'#888'}}>Vista previa de 6</div>
          </div>

          <div style={{overflowX:'auto',marginBottom:'14px',borderRadius:'12px',border:'1px solid #e5e5e5'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',minWidth:'700px'}}>
              <thead>
                <tr style={{background:'#f5f5f5'}}>
                  <th style={{padding:'8px 10px',width:'30px'}}></th>
                  {['Nombre','Categoría','Teléfono','Ciudad','Lat','Lng','Score'].map(h=>(
                    <th key={h} style={{padding:'8px 10px',textAlign:'left',fontWeight:700,borderBottom:'1px solid #e5e5e5',whiteSpace:'nowrap',color:'#555'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row,i) => (
                  <tr key={i} onClick={()=>toggleRow(i)} style={{borderBottom:'1px solid #f5f5f5',background:selected.has(i)?'rgba(5,148,79,.04)':i%2===0?'#fff':'#fafafa',cursor:'pointer'}}>
                    <td style={{padding:'7px 10px',textAlign:'center'}}>
                      <input type="checkbox" checked={selected.has(i)} onChange={()=>toggleRow(i)} onClick={e=>e.stopPropagation()} style={{width:'14px',height:'14px'}}/>
                    </td>
                    <td style={{padding:'7px 10px',fontWeight:600,maxWidth:'130px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.nombre}</td>
                    <td style={{padding:'7px 10px'}}><span style={{background:'rgba(0,200,215,.1)',color:'#0080AA',borderRadius:'20px',padding:'2px 8px',fontSize:'10px',fontWeight:700}}>{row.categoria}</span></td>
                    <td style={{padding:'7px 10px'}}>{row.telefono||<span style={{color:'#ccc'}}>—</span>}</td>
                    <td style={{padding:'7px 10px',color:'#666'}}>{row.ciudad}</td>
                    <td style={{padding:'7px 10px',color:'#888',fontFamily:'monospace',fontSize:'10px'}}>{parseFloat(row.latitud||'0').toFixed(4)}</td>
                    <td style={{padding:'7px 10px',color:'#888',fontFamily:'monospace',fontSize:'10px'}}>{parseFloat(row.longitud||'0').toFixed(4)}</td>
                    <td style={{padding:'7px 10px',textAlign:'center'}}>
                      <span style={{background:`rgba(${parseInt(row.score_confianza||'50')>60?'5,148,79':'153,96,0'},.1)`,color:parseInt(row.score_confianza||'50')>60?'#05944F':'#996000',borderRadius:'20px',padding:'2px 8px',fontSize:'10px',fontWeight:700}}>
                        {row.score_confianza||'50'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 6 && <div style={{padding:'8px 10px',fontSize:'11px',color:'#888',textAlign:'center'}}>... y {rows.length-6} más</div>}
          </div>

          <button onClick={doImport} disabled={loading||selected.size===0}
            style={{width:'100%',padding:'14px',background:loading||selected.size===0?'#ccc':'#111',color:'#fff',fontWeight:800,fontSize:'14px',border:'none',borderRadius:'13px',cursor:loading||selected.size===0?'not-allowed':'pointer',fontFamily:'inherit',transition:'background .2s'}}>
            {loading ? '⏳ Importando...' : `📥 Importar ${selected.size} proveedores a U.GO → ${destino==='prospectos'?'Prospectos':'Usuarios'}`}
          </button>
        </>
      )}
    </div>
  );
}
