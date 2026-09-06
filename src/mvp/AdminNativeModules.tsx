import React,{useMemo,useState}from'react'
import{
 useDashboardMetrics,useConversionKPIs,useSystemAlerts,useActiveServices,useOpenDisputes,
 usePendingDocuments,useVault,usePendingWithdrawals,useTarifas,useCategorias,useConfigSistema,
 useNotificaciones,useExport
}from'../hooks/useAdminData'
import{SecMapaOperativo}from'../components/MapaOperativo'
import{SecScout}from'../components/ScoutSection'
import{SecValidacionPaises,SecImportProviders}from'../components/AdvancedSections'

const money=(v:any)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const when=(v:any)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'
const box:React.CSSProperties={background:'#fff',border:'1px solid #e4e7ec',borderRadius:16,padding:16}
const grid:React.CSSProperties={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}
const table:React.CSSProperties={width:'100%',borderCollapse:'collapse',fontSize:12}
const th:React.CSSProperties={textAlign:'left',padding:'9px 8px',borderBottom:'1px solid #e4e7ec',color:'#667085',fontSize:10,textTransform:'uppercase'}
const td:React.CSSProperties={padding:'10px 8px',borderBottom:'1px solid #f2f4f7',verticalAlign:'top'}

export function AdminOverviewNative(){
 const{metrics,loading}=useDashboardMetrics();const k=useConversionKPIs()
 if(loading&&!metrics)return <div style={box}>Cargando operación…</div>
 const cards=[['Servicios activos',metrics?.servicios_activos],['Proveedores online',metrics?.proveedores_online],['Clientes',metrics?.clientes_total],['Disputas abiertas',metrics?.disputas_abiertas],['Ingresos hoy',money(metrics?.ingresos_hoy)],['Bóveda',money(metrics?.boveda_total)],['Conversión',k?.conversion_pct!=null?`${Number(k.conversion_pct).toFixed(1)}%`:'—'],['Comisión 30d',money(k?.comision_total)]]
 return <div style={grid}>{cards.map(([a,b])=><article key={String(a)} style={box}><small style={{fontWeight:800,color:'#667085'}}>{a}</small><strong style={{display:'block',fontSize:28,marginTop:7}}>{b??0}</strong></article>)}</div>
}

export function AdminServicesNative(){
 const{services,loading,refetch}=useActiveServices();
 return <div style={box}><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><strong>Servicios</strong><button onClick={refetch}>Actualizar</button></div>{loading?<p>Cargando…</p>:<div style={{overflowX:'auto'}}><table style={table}><thead><tr><th style={th}>Estado</th><th style={th}>Servicio</th><th style={th}>Cliente</th><th style={th}>Proveedor</th><th style={th}>Tarifa</th><th style={th}>Fecha</th></tr></thead><tbody>{services.map((s:any)=><tr key={s.id}><td style={td}><b>{s.estado}</b></td><td style={td}>{s.categorias?.emoji} {s.categorias?.nombre||s.descripcion||'Servicio'}</td><td style={td}>{s.clientes?.nombre||'—'}</td><td style={td}>{s.proveedores?.nombre||'Sin asignar'}</td><td style={td}>{money(s.tarifa)}</td><td style={td}>{when(s.created_at)}</td></tr>)}</tbody></table>{!services.length&&<p>Sin servicios registrados.</p>}</div>}</div>
}

export function AdminAlertsNative(){
 const{alerts,criticalCount,warningCount,refetch}=useSystemAlerts();
 return <div><div style={{...grid,marginBottom:10}}><article style={box}><small>Críticas</small><strong style={{display:'block',fontSize:28}}>{criticalCount}</strong></article><article style={box}><small>Advertencias</small><strong style={{display:'block',fontSize:28}}>{warningCount}</strong></article><button style={box} onClick={refetch}>↻ Actualizar alertas</button></div>{alerts.map((a:any,i)=><article key={a.id||i} style={{...box,marginBottom:8,borderLeft:`4px solid ${a.severidad==='critical'?'#d92d20':a.severidad==='warning'?'#dc6803':'#1570ef'}`}}><strong>{a.titulo||a.tipo||'Alerta'}</strong><p style={{marginBottom:0,color:'#667085'}}>{a.descripcion||a.mensaje||JSON.stringify(a.detalles||{})}</p></article>)}{!alerts.length&&<div style={box}>Sin alertas activas.</div>}</div>
}

export function AdminDisputesNative(){
 const{disputes,loading,resolverDisputa}=useOpenDisputes();const[selected,setSelected]=useState<any>(null);const[text,setText]=useState('');const[favor,setFavor]=useState<'cliente'|'proveedor'>('cliente')
 const resolve=async()=>{if(!selected||!text.trim())return;await resolverDisputa(selected.id,text,favor);setSelected(null);setText('')}
 return <div style={box}>{loading?<p>Cargando…</p>:<><table style={table}><thead><tr><th style={th}>Caso</th><th style={th}>Motivo</th><th style={th}>Monto</th><th style={th}>Partes</th><th style={th}></th></tr></thead><tbody>{disputes.map((d:any)=><tr key={d.id}><td style={td}><b>{d.numero||d.id.slice(0,8)}</b><br/><small>{d.estado}</small></td><td style={td}>{d.motivo}</td><td style={td}>{money(d.monto_disputado)}</td><td style={td}>{d.clientes?.nombre||'Cliente'} / {d.proveedores?.nombre||'Proveedor'}</td><td style={td}><button onClick={()=>setSelected(d)}>Resolver</button></td></tr>)}</tbody></table>{!disputes.length&&<p>Sin disputas abiertas.</p>}</>}{selected&&<div style={{marginTop:14,paddingTop:14,borderTop:'1px solid #e4e7ec'}}><strong>Resolver {selected.numero}</strong><div style={{display:'flex',gap:8,margin:'10px 0'}}><button onClick={()=>setFavor('cliente')} disabled={favor==='cliente'}>A favor cliente</button><button onClick={()=>setFavor('proveedor')} disabled={favor==='proveedor'}>A favor proveedor</button></div><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Resolución y justificación" style={{width:'100%',minHeight:90,padding:10}}/><button onClick={resolve} disabled={!text.trim()} style={{marginTop:8}}>Confirmar resolución</button></div>}</div>
}

export function AdminMapNative(){return <div style={{height:'100%',minHeight:560}}><SecMapaOperativo/></div>}
export function AdminScoutNative(){return <div style={{height:'100%',overflow:'auto'}}><SecScout/></div>}
export function AdminKycNative(){return <SecValidacionPaises/>}
export function AdminImportNative(){return <SecImportProviders/>}

export function AdminDocumentsNative(){
 const{docs,loading,updateEstado,getSignedUrl}=usePendingDocuments();const[busy,setBusy]=useState<string|null>(null)
 const open=async(d:any)=>{setBusy(d.id);const u=await getSignedUrl(d.url_storage);setBusy(null);if(u)window.open(u,'_blank','noopener,noreferrer')}
 return <div style={box}>{loading?<p>Cargando…</p>:<><table style={table}><thead><tr><th style={th}>Proveedor</th><th style={th}>Documento</th><th style={th}>Estado</th><th style={th}>OCR</th><th style={th}>Fecha</th><th style={th}>Acciones</th></tr></thead><tbody>{docs.map((d:any)=><tr key={d.id}><td style={td}>{d.usuarios?.nombre} {d.usuarios?.apellido}</td><td style={td}>{d.tipo}</td><td style={td}>{d.estado}</td><td style={td}>{typeof d.ocr_confianza==='number'?`${Math.round(d.ocr_confianza*100)}%`:'—'}</td><td style={td}>{when(d.created_at)}</td><td style={td}><div style={{display:'flex',gap:5,flexWrap:'wrap'}}><button onClick={()=>open(d)} disabled={busy===d.id}>Ver</button><button onClick={()=>updateEstado(d.id,'aprobado','Aprobado desde Admin Fase 2')}>Aprobar</button><button onClick={()=>updateEstado(d.id,'rechazado',undefined,'Rechazado desde Admin Fase 2')}>Rechazar</button></div></td></tr>)}</tbody></table>{!docs.length&&<p>Sin documentos pendientes.</p>}</>}</div>
}

export function AdminVaultNative(){
 const{escrows,liberarEscrow}=useVault();const withdrawals=usePendingWithdrawals();const total=useMemo(()=>escrows.reduce((a:any,e:any)=>a+Number(e.monto_total||0),0),[escrows])
 return <div><div style={{...grid,marginBottom:10}}><article style={box}><small>Retenido</small><strong style={{display:'block',fontSize:27}}>{money(total)}</strong></article><article style={box}><small>Escrows</small><strong style={{display:'block',fontSize:27}}>{escrows.length}</strong></article><article style={box}><small>Retiros pendientes</small><strong style={{display:'block',fontSize:27}}>{withdrawals.length}</strong></article></div><div style={box}><table style={table}><thead><tr><th style={th}>Cliente</th><th style={th}>Proveedor</th><th style={th}>Total</th><th style={th}>Comisión</th><th style={th}>Neto</th><th style={th}></th></tr></thead><tbody>{escrows.map((e:any)=><tr key={e.id}><td style={td}>{e.clientes?.nombre||'—'}</td><td style={td}>{e.proveedores?.nombre||'—'}</td><td style={td}>{money(e.monto_total)}</td><td style={td}>{money(e.comision_ugo)}</td><td style={td}>{money(e.monto_proveedor)}</td><td style={td}><button onClick={()=>liberarEscrow(e.id)}>Liberar</button></td></tr>)}</tbody></table>{!escrows.length&&<p>Bóveda vacía.</p>}</div></div>
}

export function AdminTariffsNative(){
 const{tarifas}=useTarifas();return <div style={box}><table style={table}><thead><tr><th style={th}>Categoría</th><th style={th}>Zona</th><th style={th}>Base</th><th style={th}>Hora</th><th style={th}>Mín.</th><th style={th}>Máx.</th></tr></thead><tbody>{tarifas.map((t:any)=><tr key={t.id}><td style={td}>{t.categorias?.emoji} {t.categorias?.nombre}</td><td style={td}>{t.zona}</td><td style={td}>{money(t.precio_base)}</td><td style={td}>{money(t.precio_hora)}</td><td style={td}>{money(t.precio_min)}</td><td style={td}>{money(t.precio_max)}</td></tr>)}</tbody></table>{!tarifas.length&&<p>Sin tarifas configuradas.</p>}</div>
}

export function AdminCategoriesNative(){
 const{categorias,toggleActiva}=useCategorias();return <div style={{display:'grid',gap:8}}>{categorias.map((c:any)=><article key={c.id} style={{...box,display:'flex',alignItems:'center',gap:10,opacity:c.activa?1:.6}}><span style={{fontSize:24}}>{c.emoji}</span><div style={{flex:1}}><strong>{c.nombre}</strong><small style={{display:'block',color:'#667085'}}>{c.subcategorias?.length||0} subcategorías</small></div><button onClick={()=>toggleActiva(c.id,!c.activa)}>{c.activa?'Desactivar':'Activar'}</button></article>)}</div>
}

export function AdminSystemNative(){
 const{config,update}=useConfigSistema();return <div style={box}>{Object.entries(config||{}).filter(([k])=>!k.startsWith('api_')).map(([k,v]:any)=><label key={k} style={{display:'grid',gridTemplateColumns:'minmax(180px,1fr) 2fr',gap:10,padding:'8px 0',borderBottom:'1px solid #f2f4f7'}}><span style={{fontWeight:700}}>{k.replace(/_/g,' ')}</span><input defaultValue={String(v??'')} onBlur={e=>{if(e.target.value!==String(v??''))update(k,e.target.value)}}/></label>)}</div>
}

export function AdminNotificationsNative(){
 const{hist,enviar}=useNotificaciones();const[titulo,setTitulo]=useState('');const[cuerpo,setCuerpo]=useState('');
 const send=async()=>{if(!titulo.trim()||!cuerpo.trim())return;await enviar(titulo,cuerpo,'todos');setTitulo('');setCuerpo('')}
 return <div><div style={{...box,marginBottom:10}}><strong>Enviar notificación</strong><input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Título" style={{width:'100%',marginTop:10,padding:9}}/><textarea value={cuerpo} onChange={e=>setCuerpo(e.target.value)} placeholder="Mensaje" style={{width:'100%',minHeight:90,marginTop:8,padding:9}}/><button onClick={send} disabled={!titulo.trim()||!cuerpo.trim()}>Enviar a todos</button></div><div style={box}><strong>Historial</strong>{(hist||[]).slice(0,30).map((n:any)=><div key={n.id} style={{padding:'8px 0',borderBottom:'1px solid #f2f4f7'}}><b>{n.titulo}</b><small style={{display:'block',color:'#667085'}}>{n.cuerpo} · {when(n.created_at)}</small></div>)}</div></div>
}

export function AdminReportsNative(){
 const{exportServicios,exportUsuarios}=useExport();return <div style={grid}><button style={box} onClick={()=>{void exportServicios()}}><strong>Exportar servicios</strong><span style={{display:'block',color:'#667085',marginTop:5}}>Preparar datos de operación</span></button><button style={box} onClick={()=>{void exportUsuarios()}}><strong>Exportar usuarios</strong><span style={{display:'block',color:'#667085',marginTop:5}}>Preparar datos de personas</span></button></div>
}
