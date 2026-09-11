import React,{useEffect}from'react'

export function UgoLanding(){
 useEffect(()=>{
  window.location.replace('/landing/')
 },[])
 return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',background:'#070D10',color:'#00E599',fontFamily:'Inter,system-ui,sans-serif'}} aria-live="polite">Cargando UGO…</main>
}
