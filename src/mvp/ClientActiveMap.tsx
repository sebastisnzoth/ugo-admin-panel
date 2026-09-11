import React,{useEffect,useRef,useState}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'
import * as maplibregl from'maplibre-gl'
import{getRoutingProvider}from'../lib/routing/provider'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
type Props={supabase:SupabaseClient;serviceId:string}
type TrackingRow={proveedor_id:string;provider_lat:number|null;provider_lng:number|null;client_lat:number|null;client_lng:number|null;provider_updated_at:string|null}
type TrackingRpcClient={rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown}>}
type LineGeometry={type:'LineString';coordinates:[number,number][]}

function lineGeometry(value:unknown):LineGeometry|null{
 if(!value||typeof value!=='object')return null
 const candidate=value as{type?:unknown;coordinates?:unknown}
 if(candidate.type!=='LineString'||!Array.isArray(candidate.coordinates))return null
 const coordinates=candidate.coordinates.filter((item):item is[number,number]=>Array.isArray(item)&&item.length>=2&&typeof item[0]==='number'&&typeof item[1]==='number').map(item=>[item[0],item[1]] as[number,number])
 return coordinates.length>=2?{type:'LineString',coordinates}:null
}

export function ClientActiveMap({supabase,serviceId}:Props){
 const el=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),marks=useRef<maplibregl.Marker[]>([])
 const[user,setUser]=useState<[number,number]>(FLORIPA),[provider,setProvider]=useState<[number,number]|null>(null),[eta,setEta]=useState<number|null>(null),[lastUpdate,setLastUpdate]=useState<string|null>(null)
 useEffect(()=>{let alive=true;navigator.geolocation?.getCurrentPosition(p=>{if(alive)setUser([p.coords.longitude,p.coords.latitude])},()=>{},{enableHighAccuracy:true,timeout:7000,maximumAge:45000});return()=>{alive=false}},[])
 useEffect(()=>{let alive=true;const rpc=supabase as unknown as TrackingRpcClient;const load=async()=>{const{data,error}=await rpc.rpc('obtener_tracking_servicio_cliente',{p_servicio_id:serviceId});if(!alive)return;if(error){setProvider(null);return}const raw=Array.isArray(data)?data[0]:data;const row=(raw||null)as TrackingRow|null;if(!row){setProvider(null);return}if(row.client_lat!=null&&row.client_lng!=null)setUser([Number(row.client_lng),Number(row.client_lat)]);if(row.provider_lat!=null&&row.provider_lng!=null)setProvider([Number(row.provider_lng),Number(row.provider_lat)]);else setProvider(null);setLastUpdate(row.provider_updated_at||null)};void load();const timer=window.setInterval(()=>void load(),10_000);return()=>{alive=false;window.clearInterval(timer)}},[serviceId,supabase])
 useEffect(()=>{if(!el.current||mapRef.current)return;const map=new maplibregl.Map({container:el.current,style:MAP_STYLE,center:FLORIPA,zoom:14,attributionControl:false});mapRef.current=map;return()=>{marks.current.forEach(m=>m.remove());map.remove();mapRef.current=null}},[])
 useEffect(()=>{const map=mapRef.current;if(!map)return;marks.current.forEach(m=>m.remove());marks.current=[];const u=document.createElement('div');u.className='ugo-active-user-dot';marks.current.push(new maplibregl.Marker({element:u}).setLngLat(user).addTo(map));if(provider){const p=document.createElement('div');p.className='ugo-active-provider-dot';p.textContent='●';marks.current.push(new maplibregl.Marker({element:p}).setLngLat(provider).addTo(map))}},[user,provider])
 useEffect(()=>{const map=mapRef.current;if(!map||!provider)return;let alive=true;getRoutingProvider().route({latitude:provider[1],longitude:provider[0]},{latitude:user[1],longitude:user[0]}).then(route=>{if(!alive||!mapRef.current)return;const current=mapRef.current;const geometry=lineGeometry(route.geometry)||{type:'LineString' as const,coordinates:[provider,user]};setEta(Math.max(1,Math.round(route.durationSeconds/60)));const render=()=>{if(!alive||!current.isStyleLoaded())return;if(current.getLayer('ugo-active-route'))current.removeLayer('ugo-active-route');if(current.getSource('ugo-active-route'))current.removeSource('ugo-active-route');current.addSource('ugo-active-route',{type:'geojson',data:{type:'Feature',properties:{},geometry}});current.addLayer({id:'ugo-active-route',type:'line',source:'ugo-active-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#079455','line-width':5,'line-opacity':.92}});const b=new maplibregl.LngLatBounds();geometry.coordinates.forEach(c=>b.extend(c));if(!b.isEmpty())current.fitBounds(b,{padding:{top:100,bottom:150,left:50,right:50},maxZoom:15,duration:650})};if(current.isStyleLoaded())render();else current.once('load',render)}).catch(()=>setEta(null));return()=>{alive=false}},[provider,user])
 return <div className="ugo-active-map-wrap"><div ref={el} className="ugo-active-map"/>{provider?eta?<div className="ugo-active-eta"><small>Llegando en</small><strong>{eta} min</strong>{lastUpdate&&<span>Ubicación actualizada</span>}</div>:<div className="ugo-active-eta is-syncing"><small>Calculando ruta…</small></div>:<div className="ugo-active-eta is-syncing"><small>Esperando ubicación del profesional…</small></div>}</div>
}
