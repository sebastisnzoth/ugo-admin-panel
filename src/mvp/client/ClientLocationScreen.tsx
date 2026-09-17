import React,{useEffect,useState}from'react'
import{useRoleSession}from'../shared'
import'./client-location-screen.css'

type Draft={address?:string;addressLabel?:string;complement?:string;description?:string;categoryName?:string}

export function ClientLocationScreen({onBack,onContinue}:{onBack:()=>void;onContinue:()=>void}){
 const{session}=useRoleSession('client'),[address,setAddress]=useState(''),[complement,setComplement]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const key=session?`ugo:guided-request-draft:${session.user.id}`:''
 useEffect(()=>{if(!key)return;try{const draft=JSON.parse(sessionStorage.getItem(key)||'{}')as Draft;setAddress(draft.address||'');setComplement(draft.complement||'')}catch{}},[key])
 const save=(nextAddress=address)=>{if(!key)return;try{const previous=JSON.parse(sessionStorage.getItem(key)||'{}')as Draft;sessionStorage.setItem(key,JSON.stringify({...previous,address:nextAddress,addressLabel:previous.addressLabel||'Dirección del servicio',complement}))}catch{}}
 const useLocation=()=>{if(!navigator.geolocation){setMessage('Ingresá la dirección manualmente.');return}setBusy(true);setMessage('');navigator.geolocation.getCurrentPosition(async pos=>{try{const response=await fetch(`https://photon.komoot.io/reverse?lat=${encodeURIComponent(pos.coords.latitude)}&lon=${encodeURIComponent(pos.coords.longitude)}`);const data=await response.json() as {features?:Array<{properties?:Record<string,string>}>};const p=data.features?.[0]?.properties||{};const street=p.street||p.name||'',number=p.housenumber||'',district=p.district||'',city=p.city||'';const value=[`${street}${number?` ${number}`:''}`,district,city].filter(Boolean).join(', ');if(value){setAddress(value);save(value)}else setMessage('No pudimos obtener la dirección. Escribila abajo.')}catch{setMessage('No pudimos obtener la dirección. Escribila abajo.')}finally{setBusy(false)}},()=>{setBusy(false);setMessage('No se pudo acceder a tu ubicación. Podés escribir la dirección manualmente.')},{enableHighAccuracy:true,timeout:8000,maximumAge:30000})}
 const next=()=>{if(address.trim().length<5){setMessage('Ingresá la dirección del servicio.');return}save(address.trim());onContinue()}
 if(!session)return null
 return <main className="ugo-location-screen" aria-label="Dónde es el servicio"><header><button type="button" onClick={onBack} aria-label="Volver">←</button><strong>UGO</strong><div className="ugo-location-progress"><i/><i/><i/><i/><i/></div><small>2 de 5</small></header><section><h1>¿Dónde es el servicio?</h1><p>Confirmá la dirección</p><div className="ugo-location-map"><div className="ugo-location-map-grid"/><span className="ugo-location-pin">●</span><button type="button" onClick={useLocation} disabled={busy}>⌖ {busy?'Buscando…':'Usar mi ubicación'}</button></div><label>Dirección<input value={address} onChange={e=>{setAddress(e.target.value);setMessage('')}} placeholder="Rua Apóstolo Paschoal, 123" autoComplete="street-address"/></label><label>Complemento <small>(opcional)</small><input value={complement} onChange={e=>setComplement(e.target.value)} onBlur={()=>save()} placeholder="Apto 101, bloco B"/></label>{message&&<p className="ugo-location-error" role="alert">{message}</p>}</section><footer><button type="button" onClick={next}>Continuar <span>→</span></button></footer></main>
}
export default ClientLocationScreen
