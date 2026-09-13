import React,{useEffect}from'react'

function isInteractivePreview(){
 const host=window.location.hostname
 return host==='localhost'||host==='127.0.0.1'||host.endsWith('.webcontainer.io')||host.includes('stackblitz')
}

export function UgoLanding(){
 useEffect(()=>{
  if(isInteractivePreview()){
   window.location.replace(`${window.location.pathname}?app=client`)
   return
  }
  window.location.replace('/landing/')
 },[])
 return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',background:'#070D10',color:'#00E599',fontFamily:'Inter,system-ui,sans-serif'}} aria-live="polite">Cargando UGO…</main>
}
