import React,{useCallback,useEffect,useState}from'react'
import{supabase}from'../lib/supabase'

type Notice={id:string;tipo:string;titulo:string;cuerpo:string;datos:Record<string,unknown>;leida_at:string|null;created_at:string}

export function NotificationCenter(){
 const[uid,setUid]=useState<string|null>(null),[rows,setRows]=useState<Notice[]>([]),[open,setOpen]=useState(false),[error,setError]=useState('')
 const db=supabase as any
 const load=useCallback(async(userId:string)=>{const{data,error}=await db.from('notificaciones').select('id,tipo,titulo,cuerpo,datos,leida_at,created_at').eq('usuario_id',userId).order('created_at',{ascending:false}).limit(30);if(error)throw error;setRows((data||[])as Notice[])},[db])
 useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{const id=data.session?.user.id||null;if(!alive||!id)return;setUid(id);load(id).catch(e=>setError(e.message));const ch=supabase.channel(`ugo-notices-${id}`).on('postgres_changes',{event:'*',schema:'public',table:'notificaciones',filter:`usuario_id=eq.${id}`},()=>load(id)).subscribe();(window as any).__ugoNoticeChannel=ch});return()=>{alive=false;const ch=(window as any).__ugoNoticeChannel;if(ch)supabase.removeChannel(ch)}} , [load])
 async function mark(id:string){if(!uid)return;await db.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('id',id).eq('usuario_id',uid);await load(uid)}
 async function markAll(){if(!uid)return;await db.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('usuario_id',uid).is('leida_at',null);await load(uid)}
 const unread=rows.filter(r=>!r.leida_at).length
 const icon=(t:string)=>t.includes('pago')?'💳':t.includes('oferta')?'⚡':t.includes('cancel')?'✕':t.includes('camino')?'📍':t.includes('aprob')?'✅':'🔔'
 return <>
  <button type="button" aria-label="Notificaciones UGO" onClick={()=>setOpen(v=>!v)} style={{position:'fixed',right:18,top:18,zIndex:12020,width:44,height:44,borderRadius:999,border:'1px solid rgba(0,0,0,.12)',background:'#fff',boxShadow:'0 6px 22px rgba(0,0,0,.16)',cursor:'pointer',fontSize:18}}>🔔{unread>0&&<b style={{position:'absolute',right:-3,top:-3,minWidth:19,height:19,padding:'0 4px',borderRadius:20,background:'#e11900',color:'#fff',fontSize:10,lineHeight:'19px'}}>{unread>99?'99+':unread}</b>}</button>
  {open&&<aside style={{position:'fixed',right:18,top:70,zIndex:12019,width:'min(390px,calc(100vw - 36px))',maxHeight:'min(560px,calc(100vh - 90px))',overflow:'hidden',background:'#fff',borderRadius:18,boxShadow:'0 16px 55px rgba(0,0,0,.25)',border:'1px solid rgba(0,0,0,.1)',display:'flex',flexDirection:'column'}}>
   <header style={{padding:'13px 14px',display:'flex',alignItems:'center',borderBottom:'1px solid #eee'}}><strong style={{flex:1}}>Notificaciones UGO</strong>{unread>0&&<button onClick={markAll} style={{border:0,background:'transparent',fontSize:11,fontWeight:700,cursor:'pointer'}}>Marcar todas</button>}<button onClick={()=>setOpen(false)} style={{border:0,background:'transparent',fontSize:20,cursor:'pointer'}}>×</button></header>
   <div style={{overflowY:'auto'}}>{error&&<div style={{padding:12,color:'#b00020',fontSize:11}}>{error}</div>}{rows.length===0&&!error&&<div style={{padding:26,textAlign:'center',color:'#777',fontSize:12}}>Sin notificaciones todavía.</div>}{rows.map(n=><button key={n.id} onClick={()=>mark(n.id)} style={{display:'grid',gridTemplateColumns:'34px 1fr',gap:8,width:'100%',textAlign:'left',border:0,borderBottom:'1px solid #f1f1f1',padding:'11px 12px',background:n.leida_at?'#fff':'#f3f7ff',cursor:'pointer'}}><span style={{fontSize:20}}>{icon(n.tipo)}</span><span><strong style={{display:'block',fontSize:12}}>{n.titulo}</strong><span style={{display:'block',fontSize:11,lineHeight:1.4,color:'#555',marginTop:2}}>{n.cuerpo}</span><small style={{display:'block',opacity:.5,marginTop:4}}>{new Date(n.created_at).toLocaleString('pt-BR')}</small></span></button>)}</div>
  </aside>}
 </>
}
