import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'

type VerificationState='registrado'|'pendiente'|'verificado'|'rechazado'|'suspendido'
type ProviderRow={usuario_id:string;estado_verificacion:VerificationState;motivo_rechazo:string|null;bio:string|null;tarifa_base:number|string|null;online:boolean;disponible:boolean;ciudad_base:string|null;telefono_profesional:string|null;experiencia_anos:number|null;especialidades:any;updated_at:string;categoria_principal_id:string|null;usuario?:{nombre:string;apellido:string|null;email:string|null;karma:number;servicios_completados:number;activo:boolean;zona:string|null;pais:string|null}|null;categoria?:{nombre:string;emoji:string}|null}

export function AdminProviderVerificationPanel(){
 const[open,setOpen]=useState(false),[rows,setRows]=useState<ProviderRow[]>([]),[filter,setFilter]=useState<'todos'|VerificationState>('pendiente'),[motives,setMotives]=useState<Record<string,string>>({}),[busy,setBusy]=useState(''),[message,setMessage]=useState('')
 const load=useCallback(async()=>{
  const[{data:profiles,error:pe},{data:users,error:ue},{data:cats,error:ce}]=await Promise.all([
   supabase.from('perfiles_proveedor').select('usuario_id,estado_verificacion,motivo_rechazo,bio,tarifa_base,online,disponible,ciudad_base,telefono_profesional,experiencia_anos,especialidades,updated_at,categoria_principal_id').order('updated_at',{ascending:false}),
   supabase.from('usuarios').select('id,nombre,apellido,email,karma,servicios_completados,activo,zona,pais,tipo'),
   supabase.from('categorias').select('id,nombre,emoji'),
  ]);
  if(pe)throw pe;if(ue)throw ue;if(ce)throw ce;
  const um=new Map((users||[]).map((u:any)=>[u.id,u]));
  const cm=new Map((cats||[]).map((c:any)=>[c.id,c]));
  const merged=((profiles||[]) as any[]).map(p=>({
   ...p,
   usuario:um.get(p.usuario_id)||null,
   categoria:p.categoria_principal_id?cm.get(p.categoria_principal_id)||null:null,
  })) as ProviderRow[];
  setRows(merged);
 },[])
 useEffect(()=>{if(!open)return;load().catch(e=>setMessage(e.message));const ch=supabase.channel('admin-provider-verification').on('postgres_changes',{event:'*',schema:'public',table:'perfiles_proveedor'},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'usuarios'},()=>load()).subscribe();return()=>{supabase.removeChannel(ch)}},[open,load])
 const visible=useMemo(()=>filter==='todos'?rows:rows.filter(r=>r.estado_verificacion===filter),[rows,filter])
 const pending=rows.filter(r=>['registrado','pendiente'].includes(r.estado_verificacion)).length
 async function change(row:ProviderRow,state:VerificationState){
  const reason=(motives[row.usuario_id]||'').trim();
  if(state==='rechazado'&&!reason)return setMessage('Escribí el motivo antes de rechazar.');
  setBusy(row.usuario_id+state);setMessage('');
  try{
   const{error}=await (supabase as any).rpc('admin_cambiar_verificacion_proveedor',{p_proveedor_id:row.usuario_id,p_estado:state,p_motivo:reason||null});
   if(error)throw error;
   setMessage(state==='verificado'?'✅ Proveedor verificado correctamente.':state==='rechazado'?'Proveedor rechazado con motivo registrado.':'Estado actualizado.');
   await load();
  }catch(e){setMessage(`Error: ${e instanceof Error?e.message:'No se pudo actualizar el proveedor.'}`)}finally{setBusy('')}
 }
 const label=(s:VerificationState)=>({registrado:'Registrado',pendiente:'Pendiente',verificado:'Verificado',rechazado:'Rechazado',suspendido:'Suspendido'}[s])
 const specialText=(v:any)=>Array.isArray(v)?v.join(', '):v&&typeof v==='object'?JSON.stringify(v):String(v||'')
 return <>
  <button type="button" onClick={()=>setOpen(v=>!v)} style={{position:'fixed',left:18,bottom:68,zIndex:14018,border:0,borderRadius:999,padding:'11px 15px',fontWeight:900,background:'#fff',color:'#111',boxShadow:'0 8px 28px rgba(0,0,0,.22)',cursor:'pointer'}}>✅ Proveedores{pending>0?` (${pending})`:''}</button>
  {open&&<aside style={{position:'fixed',left:18,bottom:118,zIndex:14017,width:'min(610px,calc(100vw - 36px))',maxHeight:'min(720px,calc(100vh - 140px))',overflow:'auto',background:'#fff',border:'1px solid #ddd',borderRadius:22,boxShadow:'0 18px 60px rgba(0,0,0,.3)',padding:16,color:'#111'}}>
   <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1}}><strong>Verificación de Proveedores</strong><div style={{fontSize:11,opacity:.6}}>Estado operativo real de UGO · {rows.length} proveedores</div></div><button onClick={()=>setOpen(false)} style={{border:0,background:'transparent',fontSize:22,cursor:'pointer'}}>×</button></div>
   <div style={{display:'flex',gap:5,overflowX:'auto',padding:'12px 0'}}>{(['todos','registrado','pendiente','verificado','rechazado','suspendido'] as const).map(x=><button key={x} onClick={()=>setFilter(x)} style={{border:'1px solid #ddd',background:filter===x?'#111820':'#fff',color:filter===x?'#fff':'#111',borderRadius:999,padding:'7px 10px',whiteSpace:'nowrap',fontSize:11,fontWeight:700}}>{x==='todos'?'Todos':label(x)}</button>)}</div>
   {visible.length===0&&<div style={{padding:24,textAlign:'center',opacity:.6,fontSize:12}}>No hay proveedores en este estado.</div>}
   {visible.map(r=><article key={r.usuario_id} style={{border:'1px solid #e5e7eb',borderRadius:16,padding:12,marginBottom:9}}><div style={{display:'flex',gap:10,alignItems:'start'}}><div style={{flex:1}}><strong>{r.usuario?.nombre||'Proveedor'} {r.usuario?.apellido||''}</strong><small style={{display:'block',marginTop:2,opacity:.6}}>{r.usuario?.email||'Email en Auth'} · {r.categoria?.emoji||'🛠️'} {r.categoria?.nombre||'Sin categoría'} · ⭐ {Number(r.usuario?.karma||0).toFixed(1)} · {r.usuario?.servicios_completados||0} trabajos</small><small style={{display:'block',marginTop:2,opacity:.6}}>{r.ciudad_base||r.usuario?.zona||'Ubicación no informada'} · {r.telefono_profesional||'Sin teléfono profesional'}</small></div><span style={{padding:'5px 8px',borderRadius:999,background:'#f2f4f7',fontSize:10,fontWeight:800}}>{label(r.estado_verificacion)}</span></div>
    {(r.bio||r.especialidades||r.experiencia_anos!=null)&&<div style={{fontSize:11,lineHeight:1.45,marginTop:8,color:'#475467'}}>{r.bio&&<div>{r.bio}</div>}{r.especialidades&&<div><b>Especialidades:</b> {specialText(r.especialidades)}</div>}{r.experiencia_anos!=null&&<div><b>Experiencia:</b> {r.experiencia_anos} años</div>}</div>}
    {r.motivo_rechazo&&<div style={{fontSize:11,color:'#b42318',marginTop:7}}><b>Motivo:</b> {r.motivo_rechazo}</div>}
    <textarea value={motives[r.usuario_id]||''} onChange={e=>setMotives(v=>({...v,[r.usuario_id]:e.target.value}))} placeholder="Motivo del rechazo (obligatorio al rechazar)" style={{width:'100%',minHeight:54,marginTop:9,padding:8,border:'1px solid #d0d5dd',borderRadius:10,fontSize:11}}/>
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:7}}><button disabled={!!busy||r.estado_verificacion==='verificado'} onClick={()=>change(r,'verificado')} style={{padding:'8px 10px',border:0,borderRadius:10,background:'#067647',color:'#fff',fontWeight:800}}>✓ Verificar</button><button disabled={!!busy} onClick={()=>change(r,'rechazado')} style={{padding:'8px 10px',border:'1px solid #f4b4b4',borderRadius:10,background:'#fff',color:'#b42318',fontWeight:800}}>Rechazar</button><button disabled={!!busy} onClick={()=>change(r,'pendiente')} style={{padding:'8px 10px',border:'1px solid #ddd',borderRadius:10,background:'#fff'}}>Pendiente</button><button disabled={!!busy} onClick={()=>change(r,'suspendido')} style={{padding:'8px 10px',border:'1px solid #ddd',borderRadius:10,background:'#fff'}}>Suspender verificación</button></div>
   </article>)}
   {message&&<div style={{fontSize:12,padding:'8px 0',fontWeight:700}}>{message}</div>}
   <p style={{fontSize:10,opacity:.6,lineHeight:1.4,marginTop:10}}>Este panel cambia únicamente el estado de verificación. No fabrica documentos ni confirma identidad sin revisión administrativa.</p>
  </aside>}
 </>
}
