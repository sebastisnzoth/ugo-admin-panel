import React from'react'
import{reportSentinelIncident}from'../lib/sentinel'
import{Button,Card}from'../shared/ui'

export class AppErrorBoundary extends React.Component<React.PropsWithChildren,{error:Error|null}>{
 state={error:null as Error|null}
 static getDerivedStateFromError(error:Error){return{error}}
 componentDidCatch(error:Error,info:React.ErrorInfo){
  console.error('UGO runtime error',error,info)
  void reportSentinelIncident({eventType:'react_render_error',message:error.message||'React no pudo renderizar la pantalla',error,severity:'P0',metadata:{componentStack:info.componentStack||''}})
 }
 render(){
  if(!this.state.error)return this.props.children
  return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:'var(--ugo-space-6)',background:'var(--ugo-color-page)',color:'var(--ugo-color-text)'}}><Card style={{width:'min(480px,100%)',boxShadow:'var(--ugo-shadow-lg)',padding:'var(--ugo-space-6)'}}><strong style={{color:'var(--ugo-color-brand-600)',fontSize:13,letterSpacing:'.05em'}}>U.GO</strong><h1 style={{fontSize:24,margin:'8px 0'}}>No pudimos cargar esta pantalla</h1><p style={{color:'var(--ugo-color-text-muted)',lineHeight:1.5}}>La aplicación encontró un error temporal. El Sentinela registró el fallo para Desarrollo. Recargá para volver a entrar sin perder tu cuenta.</p><Button variant="primary" size="lg" style={{width:'100%'}} onClick={()=>window.location.reload()}>Recargar UGO</Button></Card></main>
 }
}
