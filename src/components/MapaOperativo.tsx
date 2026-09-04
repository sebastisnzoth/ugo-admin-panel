import React from 'react';
import { supabase } from '../lib/supabase';

declare const L: any;

type MapUser = {
  id:string; nombre:string; apellido:string|null; tipo:'proveedor'|'cliente'; email:string|null; telefono:string|null;
  categoria:string|null; karma:number|null; activo:boolean; online:boolean; lat:number|null; lng:number|null; zona:string|null; endereco:string|null; bio:string|null;
};
type MapService = {id:string;estado:string;descripcion:string|null;tarifa:number|null;created_at:string;lat_cliente:number|null;lng_cliente:number|null;proveedor_lat:number|null;proveedor_lng:number|null};
type Cat = {slug:string;nombre:string;emoji:string|null};

function pin(color:string,emoji:string,sz=32){
  const tail=Math.round(sz*.4);
  return L.divIcon({html:`<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,.28))"><div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:${Math.round(sz*.43)}px">${emoji}</div><div style="width:0;height:0;border-left:${tail}px solid transparent;border-right:${tail}px solid transparent;border-top:${Math.round(tail*1.4)}px solid ${color};margin-top:-2px"></div></div>`,className:'',iconSize:[sz,sz+tail+8],iconAnchor:[sz/2,sz+tail+8],popupAnchor:[0,-(sz+tail+8)]});
}
function clientPin(){return pin('#276EF1','👤',28)}
function providerColor(u:MapUser){return !u.activo?'#E11900':u.online?'#05944F':'#F59E0B'}
function haversine(a:number,b:number,c:number,d:number){const R=6371000,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,q=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))}

export function SecMapaOperativo(){
  const mapEl=React.useRef<HTMLDivElement>(null),mapRef=React.useRef<any>(null),markers=React.useRef<any[]>([]),lines=React.useRef<any[]>([]);
  const[users,setUsers]=React.useState<MapUser[]>([]),[services,setServices]=React.useState<MapService[]>([]),[cats,setCats]=React.useState<Cat[]>([]);
  const[loading,setLoading]=React.useState(true),[error,setError]=React.useState(''),[lastUpd,setLastUpd]=React.useState('—'),[auto,setAuto]=React.useState(true);
  const[showProv,setShowProv]=React.useState(true),[showCli,setShowCli]=React.useState(true),[status,setStatus]=React.useState<'todos'|'online'|'offline'|'inactivo'>('todos'),[category,setCategory]=React.useState('todos'),[zone,setZone]=React.useState('');
  const[selected,setSelected]=React.useState<MapUser|null>(null),[geoSearch,setGeoSearch]=React.useState(''),[geoRadius,setGeoRadius]=React.useState(0),[geoCenter,setGeoCenter]=React.useState<[number,number]|null>(null),[geoBusy,setGeoBusy]=React.useState(false);

  const load=React.useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const[{data:u,error:ue},{data:s,error:se},{data:c,error:ce}]=await Promise.all([
        (supabase as any).from('mapa_operativo_usuarios').select('id,nombre,apellido,tipo,email,telefono,categoria,karma,activo,online,lat,lng,zona,endereco,bio').not('lat','is',null).limit(500),
        (supabase as any).from('mapa_operativo_servicios').select('id,estado,descripcion,tarifa,created_at,lat_cliente,lng_cliente,proveedor_lat,proveedor_lng').in('estado',['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion']).limit(100),
        (supabase as any).from('categorias').select('slug,nombre,emoji').eq('activa',true).order('nombre')
      ]);
      if(ue)throw ue;if(se)throw se;if(ce)throw ce;
      setUsers((u||[]) as MapUser[]);setServices((s||[]) as MapService[]);setCats((c||[]) as Cat[]);setLastUpd(new Date().toLocaleTimeString('es-AR'));
    }catch(e:any){setError(e?.message||'No se pudo cargar el mapa operativo')}
    finally{setLoading(false)}
  },[]);

  React.useEffect(()=>{load()},[load]);
  React.useEffect(()=>{if(!auto)return;const t=setInterval(load,15000);return()=>clearInterval(t)},[auto,load]);
  React.useEffect(()=>{if(mapRef.current||!mapEl.current)return;const init=()=>{if(mapRef.current||!mapEl.current)return;const map=L.map(mapEl.current,{zoomControl:true,attributionControl:false}).setView([-27.5969,-48.5495],12);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);mapRef.current=map;[100,400,800].forEach(t=>setTimeout(()=>map.invalidateSize(),t))};if((window as any).L)init();else{const js=document.createElement('script');js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';js.onload=init;document.head.appendChild(js)}},[]);

  const catEmoji=React.useMemo(()=>Object.fromEntries(cats.map(c=>[c.slug,c.emoji||'🔧'])),[cats]);
  const visible=React.useMemo(()=>users.filter(u=>{
    if(u.tipo==='proveedor'&&!showProv)return false;if(u.tipo==='cliente'&&!showCli)return false;
    if(u.tipo==='proveedor'){
      if(status==='online'&&!u.online)return false;
      if(status==='offline'&&(u.online||!u.activo))return false;
      if(status==='inactivo'&&u.activo)return false;
      if(category!=='todos'&&u.categoria!==category)return false;
      if(zone&&!(u.zona||'').toLowerCase().includes(zone.toLowerCase()))return false;
    }
    if(geoCenter&&geoRadius>0&&u.lat!=null&&u.lng!=null&&haversine(geoCenter[0],geoCenter[1],u.lat,u.lng)>geoRadius)return false;
    return u.lat!=null&&u.lng!=null;
  }),[users,showProv,showCli,status,category,zone,geoCenter,geoRadius]);

  React.useEffect(()=>{
    const map=mapRef.current;if(!map||!(window as any).L)return;
    markers.current.forEach(m=>m.remove());markers.current=[];lines.current.forEach(l=>l.remove());lines.current=[];
    visible.forEach(u=>{const icon=u.tipo==='proveedor'?pin(providerColor(u),catEmoji[u.categoria||'']||'🔧'):clientPin();const m=L.marker([u.lat,u.lng],{icon}).addTo(map);m.bindPopup(`<div style="font-family:Inter,sans-serif;min-width:170px"><b>${u.nombre} ${u.apellido||''}</b><br><small>${u.tipo==='proveedor'?(u.categoria||'Proveedor'):'Cliente'}</small>${u.telefono?`<br>📱 ${u.telefono}`:''}${u.zona?`<br>📍 ${u.zona}`:''}</div>`);m.on('click',()=>setSelected(u));markers.current.push(m)});
    services.forEach(s=>{if(s.lat_cliente==null||s.lng_cliente==null||s.proveedor_lat==null||s.proveedor_lng==null)return;const color=s.estado==='en_camino'?'#F59E0B':'#8B5CF6';lines.current.push(L.polyline([[s.lat_cliente,s.lng_cliente],[s.proveedor_lat,s.proveedor_lng]],{color,weight:2.5,opacity:.85,dashArray:'6 4'}).addTo(map))});
    if(visible.length&&!geoCenter){try{map.fitBounds(visible.map(u=>[u.lat,u.lng]),{padding:[40,40],maxZoom:14})}catch{}}
  },[visible,services,catEmoji,geoCenter]);

  async function goLocation(){if(!geoSearch.trim())return;setGeoBusy(true);try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(geoSearch)}&format=json&limit=1`);const d=await r.json();if(!d?.[0])throw new Error('Localidad no encontrada');const la=Number(d[0].lat),lo=Number(d[0].lon);setGeoCenter([la,lo]);mapRef.current?.setView([la,lo],13)}catch(e:any){setError(e.message)}finally{setGeoBusy(false)}}

  const prov=users.filter(u=>u.tipo==='proveedor'),online=prov.filter(u=>u.online&&u.activo).length,offline=prov.filter(u=>!u.online&&u.activo).length,clients=users.filter(u=>u.tipo==='cliente').length;
  const pill=(label:string,value:number,color:string)=> <div style={{background:color+'14',borderRadius:20,padding:'3px 9px',fontSize:10,fontWeight:700,color}}>{value} {label}</div>;

  return <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
    <div style={{padding:'8px 14px',borderBottom:'1px solid #e5e5e5',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',background:'#fff'}}>
      <strong style={{fontSize:14}}>🗺 Mapa Operativo</strong>{pill('Proveedores',prov.length,'#276EF1')}{pill('Online',online,'#05944F')}{pill('Offline',offline,'#F59E0B')}{pill('Clientes',clients,'#276EF1')}{pill('Servicios',services.length,'#8B5CF6')}
      <div style={{flex:1}}/><input value={geoSearch} onChange={e=>setGeoSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&goLocation()} placeholder="Buscar ciudad, barrio..." style={{padding:'7px 10px',border:'1px solid #ddd',borderRadius:8,width:190}}/><select value={geoRadius} onChange={e=>setGeoRadius(Number(e.target.value))} style={{padding:'7px',border:'1px solid #ddd',borderRadius:8}}><option value={0}>Sin radio</option><option value={2000}>2 km</option><option value={5000}>5 km</option><option value={10000}>10 km</option><option value={20000}>20 km</option></select><button onClick={goLocation} disabled={geoBusy} style={{padding:'7px 10px',border:0,borderRadius:8,background:'#276EF1',color:'#fff'}}>🗺 Ir</button><button onClick={load} style={{padding:'7px 10px',border:0,borderRadius:8,background:'#111',color:'#fff'}}>↻</button><label style={{fontSize:11}}><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/> Auto</label><span style={{fontSize:10,color:'#999'}}>{visible.length} visibles · {lastUpd}</span>
    </div>
    {error&&<div style={{padding:'8px 14px',background:'#fff1f0',color:'#b42318',fontSize:12}}>⚠️ {error}</div>}
    <div style={{flex:1,display:'flex',minHeight:0}}>
      <aside style={{width:190,background:'#fafafa',borderRight:'1px solid #e5e5e5',padding:12,overflowY:'auto'}}>
        <small style={{fontWeight:800,color:'#999'}}>TIPO</small><label style={{display:'block',marginTop:8,fontSize:12}}><input type="checkbox" checked={showProv} onChange={e=>setShowProv(e.target.checked)}/> 🔧 Proveedores</label><label style={{display:'block',marginTop:6,fontSize:12}}><input type="checkbox" checked={showCli} onChange={e=>setShowCli(e.target.checked)}/> 👤 Clientes</label>
        <div style={{marginTop:16}}><small style={{fontWeight:800,color:'#999'}}>ESTADO</small>{[['todos','⚫ Todos'],['online','🟢 Online'],['offline','🟡 Activos / Offline'],['inactivo','🔴 Inactivos']].map(([v,l])=><label key={v} style={{display:'block',marginTop:6,fontSize:11}}><input type="radio" checked={status===v} onChange={()=>setStatus(v as any)}/> {l}</label>)}</div>
        <div style={{marginTop:16}}><small style={{fontWeight:800,color:'#999'}}>CATEGORÍA</small><div onClick={()=>setCategory('todos')} style={{marginTop:7,padding:'5px 7px',cursor:'pointer',borderRadius:7,background:category==='todos'?'#e8f5ee':'transparent',fontSize:11}}>📍 Todos</div>{cats.map(c=><div key={c.slug} onClick={()=>setCategory(c.slug)} style={{padding:'5px 7px',cursor:'pointer',borderRadius:7,background:category===c.slug?'#e8f5ee':'transparent',fontSize:11}}>{c.emoji||'🔧'} {c.nombre}</div>)}</div>
        <div style={{marginTop:16}}><small style={{fontWeight:800,color:'#999'}}>ZONA / BARRIO</small><input value={zone} onChange={e=>setZone(e.target.value)} placeholder="Filtrar..." style={{marginTop:7,width:'100%',boxSizing:'border-box',padding:'7px',border:'1px solid #ddd',borderRadius:8}}/></div>
      </aside>
      <div style={{flex:1,position:'relative'}}><div ref={mapEl} style={{width:'100%',height:'100%'}}/>{loading&&<div style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',background:'#fff',padding:'8px 14px',borderRadius:12,boxShadow:'0 2px 10px #0002',zIndex:999,fontSize:12}}>⏳ Cargando mapa...</div>}{!loading&&!error&&visible.length===0&&<div style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',background:'#fff',padding:'9px 15px',borderRadius:12,boxShadow:'0 2px 10px #0002',zIndex:999,fontSize:12}}>📍 No hay ubicaciones para estos filtros</div>}</div>
      {selected&&<aside style={{width:230,borderLeft:'1px solid #e5e5e5',background:'#fff',padding:14,overflowY:'auto'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong>{selected.tipo==='proveedor'?'🔧 Proveedor':'👤 Cliente'}</strong><button onClick={()=>setSelected(null)} style={{border:0,background:'none'}}>✕</button></div><h3>{selected.nombre} {selected.apellido||''}</h3><p style={{fontSize:12}}>{selected.tipo==='proveedor'?(selected.categoria||'Sin categoría'):'Cliente'}</p><p style={{fontSize:12}}>📍 {selected.zona||selected.endereco||'Sin zona'}</p><p style={{fontSize:12}}>GPS: {selected.lat?.toFixed(5)}, {selected.lng?.toFixed(5)}</p>{selected.telefono&&<a href={`https://wa.me/${selected.telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">WhatsApp</a>}</aside>}
    </div>
  </div>
}
