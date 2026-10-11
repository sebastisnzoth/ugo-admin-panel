import React,{useEffect,useRef,useState}from'react'
import type * as maplibregl from'maplibre-gl'
import{loadMaplibre}from'../../lib/maplibreLoader'
import type{DemandSignal}from'./providerTypes'
import'./provider-demand-map.css'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
type Props={signals:DemandSignal[];online:boolean}

export function ProviderDemandMap({signals,online}:Props){
 const el=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),markers=useRef<maplibregl.Marker[]>([])
 const[mapReady,setMapReady]=useState(false)
 const located=signals.filter((signal):signal is DemandSignal&{latitude:number;longitude:number}=>signal.latitude!=null&&signal.longitude!=null)
 useEffect(()=>{
  if(!el.current||mapRef.current)return
  let alive=true
  // maplibre-gl (~1 MB) se descarga recién cuando este mapa se monta.
  void loadMaplibre().then(maplibregl=>{
   if(!alive||!el.current||mapRef.current)return
   const map=new maplibregl.Map({container:el.current,style:MAP_STYLE,center:FLORIPA,zoom:11,attributionControl:false})
   mapRef.current=map;setMapReady(true)
  }).catch(error=>console.warn('[ProviderDemandMap] maplibre load failed',error))
  return()=>{alive=false;setMapReady(false);markers.current.forEach(marker=>marker.remove());markers.current=[];mapRef.current?.remove();mapRef.current=null}
 },[])
 useEffect(()=>{
  const map=mapRef.current
  if(!map||!mapReady)return
  let alive=true
  markers.current.forEach(marker=>marker.remove());markers.current=[]
  if(!located.length){map.easeTo({center:FLORIPA,zoom:11,duration:350});return}
  void loadMaplibre().then(maplibregl=>{
   if(!alive||mapRef.current!==map)return
   const bounds=new maplibregl.LngLatBounds()
   located.forEach(signal=>{const node=document.createElement('span');node.className=`provider-demand-marker is-${signal.demandLevel}`;node.setAttribute('role','img');node.setAttribute('aria-label',`${signal.demandLevel==='high'?'Alta':signal.demandLevel==='medium'?'Media':'Baja'} demanda en ${signal.zone}`);node.textContent=signal.demandLevel==='high'?'Alta':signal.demandLevel==='medium'?'Media':'Baja';const point:[number,number]=[signal.longitude,signal.latitude];bounds.extend(point);markers.current.push(new maplibregl.Marker({element:node,anchor:'center'}).setLngLat(point).addTo(map))})
   if(located.length===1)map.easeTo({center:[located[0].longitude,located[0].latitude],zoom:13,duration:450});else map.fitBounds(bounds,{padding:48,maxZoom:14,duration:500})
  }).catch(error=>console.warn('[ProviderDemandMap] markers load failed',error))
  return()=>{alive=false}
 },[located,mapReady])
 const status=!online?'Radar visible · activá Online para recibir trabajos':located.length?`${located.length} zona${located.length===1?'':'s'} geográfica${located.length===1?'':'s'} activa${located.length===1?'':'s'}`:signals.length?'Hay demanda, pero sin coordenadas publicadas':'Sin demanda compatible ahora'
 return <div className="provider-demand-map"><div ref={el} className="provider-demand-map-canvas" role="img" aria-label="Mapa de zonas agregadas de demanda del radar UGO"/><div className="provider-map-label">{status}</div>{signals.length>located.length&&<div className="provider-demand-map-note">{signals.length-located.length} zona{signals.length-located.length===1?'':'s'} sin coordenadas publicadas no se dibuja{signals.length-located.length===1?'':'n'} en el mapa.</div>}</div>
}
