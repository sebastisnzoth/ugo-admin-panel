import React,{useEffect,useMemo,useRef,useState}from'react'
import type * as maplibregl from'maplibre-gl'
import{loadMaplibre}from'../../lib/maplibreLoader'
import type{DemandSignal}from'./providerTypes'
import'./provider-demand-map.css'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
type Props={signals:DemandSignal[];online:boolean;selectedZone?:string|null;onSelectZone?:(zone:string)=>void;providerPosition?:[number,number]|null}
type Located=DemandSignal&{latitude:number;longitude:number}
const valid=(s:DemandSignal):s is Located=>Number.isFinite(s.latitude)&&Number.isFinite(s.longitude)&&s.latitude!==null&&s.longitude!==null&&Math.abs(s.latitude)<=90&&Math.abs(s.longitude)<=180
const weight=(level:DemandSignal['demandLevel'])=>level==='high'?1:level==='medium'?.65:.3
const HEAT_SOURCE='ugo-real-demand'
const heatLayer:maplibregl.HeatmapLayerSpecification={id:'ugo-demand-heat',type:'heatmap',source:HEAT_SOURCE,paint:{
 'heatmap-weight':['get','weight'],
 'heatmap-intensity':['interpolate',['linear'],['zoom'],8,.55,13,1.7],
 'heatmap-radius':['interpolate',['linear'],['zoom'],8,22,13,55],
 'heatmap-opacity':.78,
 'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(20,120,95,0)',.15,'#5cbf91',.35,'#e9d45a',.62,'#f39d40',.85,'#de5442',1,'#b91c1c']
}}
function asGeojson(signals:Located[]){
 return{type:'FeatureCollection' as const,features:signals.map(s=>({type:'Feature' as const,geometry:{type:'Point' as const,coordinates:[s.longitude,s.latitude]},properties:{id:s.id,zone:s.zone,weight:weight(s.demandLevel)}}))}
}
export function ProviderDemandMap({signals,online,selectedZone,onSelectZone,providerPosition}:Props){
 const el=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),markers=useRef<maplibregl.Marker[]>([])
 const[mapReady,setMapReady]=useState(false),[error,setError]=useState('')
 const located=useMemo(()=>signals.filter(valid),[signals])
 const geojson=useMemo(()=>asGeojson(located),[located])
 const providerMarker=useRef<maplibregl.Marker|null>(null)
 useEffect(()=>{
  if(!el.current||mapRef.current)return
  let alive=true
  void loadMaplibre().then(lib=>{
   if(!alive||!el.current||mapRef.current)return
   const map=new lib.Map({container:el.current,style:MAP_STYLE,center:FLORIPA,zoom:11,attributionControl:false})
   map.addControl(new lib.NavigationControl({showCompass:false}),'top-right')
   mapRef.current=map
   map.on('load',()=>{if(!alive)return;map.addSource(HEAT_SOURCE,{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer(heatLayer);map.resize();setMapReady(true)})
   map.on('error',()=>{if(alive)setError('O mapa não está disponível. Tente atualizar.')})
  }).catch(()=>{if(alive)setError('Não foi possível carregar o mapa.')})
  return()=>{alive=false;setMapReady(false);markers.current.forEach(m=>m.remove());markers.current=[];providerMarker.current?.remove();providerMarker.current=null;mapRef.current?.remove();mapRef.current=null}
 },[])
 useEffect(()=>{
  const map=mapRef.current;if(!map||!mapReady)return
  const source=map.getSource(HEAT_SOURCE) as maplibregl.GeoJSONSource|undefined
  source?.setData(geojson)
  markers.current.forEach(m=>m.remove());markers.current=[]
  if(!located.length){map.easeTo({center:FLORIPA,zoom:11,duration:300});return}
  let alive=true
  void loadMaplibre().then(lib=>{
   if(!alive||mapRef.current!==map)return
   const bounds=new lib.LngLatBounds()
   located.forEach(s=>{
    const node=document.createElement('button');node.type='button';node.className='provider-demand-zone-pin'+(s.zone===selectedZone?' selected':'')
    node.textContent=s.zone;node.setAttribute('aria-label',`Selecionar zona ${s.zone}`)
    node.addEventListener('click',()=>onSelectZone?.(s.zone))
    const pt:[number,number]=[s.longitude,s.latitude];bounds.extend(pt)
    markers.current.push(new lib.Marker({element:node,anchor:'bottom'}).setLngLat(pt).addTo(map))
   })
   if(located.length===1)map.easeTo({center:[located[0].longitude,located[0].latitude],zoom:13,duration:350})
   else map.fitBounds(bounds,{padding:70,maxZoom:14,duration:400})
  }).catch(()=>{if(alive)setError('Não foi possível atualizar as zonas.')})
  return()=>{alive=false}
 },[geojson,located,mapReady,onSelectZone,selectedZone])
 useEffect(()=>{const map=mapRef.current;if(!mapReady||!map)return;providerMarker.current?.remove();providerMarker.current=null;if(!providerPosition)return;let alive=true;void loadMaplibre().then(lib=>{if(!alive||mapRef.current!==map)return;const node=document.createElement('div');node.className='provider-demand-self-pin';node.setAttribute('aria-label','Minha localização GPS');providerMarker.current=new lib.Marker({element:node}).setLngLat(providerPosition).addTo(map);map.easeTo({center:providerPosition,zoom:12,duration:400})});return()=>{alive=false}},[providerPosition,mapReady])
 const status=!online?'Radar visível · fique Online para receber ofertas':located.length?`${located.length} sinal${located.length===1?'':'is'} de demanda geolocalizado${located.length===1?'':'s'}`:signals.length?'Demanda sem coordenadas públicas':'Sem demanda compatível agora'
 return <div className="provider-demand-map">
  <div ref={el} className="provider-demand-map-canvas" aria-label="Mapa de calor de demanda real UGO"/>
  {!mapReady&&!error&&<div className="provider-demand-map-loading" role="status">Carregando mapa…</div>}
  {error&&<div className="provider-demand-map-loading" role="alert">{error}</div>}
  <div className="provider-map-label">{status}</div>
  <div className="provider-demand-legend" aria-label="Intensidade da demanda"><span>Baixa</span><i/><span>Alta</span></div>
  {signals.length>located.length&&<div className="provider-demand-map-note">{signals.length-located.length} sinal(is) sem coordenadas não exibido(s).</div>}
 </div>
}
