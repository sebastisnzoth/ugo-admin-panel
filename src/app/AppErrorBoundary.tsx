import React from'react'
import{useLocale}from'../i18n/locale'
import{reportSentinelIncident}from'../lib/sentinel'
import{Button,Card}from'../shared/ui'

class AppErrorBoundaryView extends React.Component<React.PropsWithChildren<{t:(key:string)=>string}>,{error:Error|null}>{
 state={error:null as Error|null}
 static getDerivedStateFromError(error:Error){return{error}}
 componentDidCatch(error:Error,info:React.ErrorInfo){
  console.error('UGO runtime error',error,info)
  void reportSentinelIncident({eventType:'react_render_error',message:error.message||'React no pudo renderizar la pantalla',error,severity:'P0',metadata:{componentStack:info.componentStack||''}})
 }
 render(){
  if(!this.state.error)return this.props.children
  const{t}=this.props
  return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:'var(--ugo-space-6)',background:'var(--ugo-color-page)',color:'var(--ugo-color-text)'}}><Card style={{width:'min(480px,100%)',boxShadow:'var(--ugo-shadow-lg)',padding:'var(--ugo-space-6)'}}><strong style={{color:'var(--ugo-color-brand-600)',fontSize:13,letterSpacing:'.05em'}}>U.GO</strong><h1 style={{fontSize:24,margin:'8px 0'}}>{t('errorBoundary.title')}</h1><p style={{color:'var(--ugo-color-text-muted)',lineHeight:1.5}}>{t('errorBoundary.description')}</p><Button variant="primary" size="lg" style={{width:'100%'}} onClick={()=>window.location.reload()}>{t('errorBoundary.reload')}</Button></Card></main>
 }
}

export function AppErrorBoundary({children}:React.PropsWithChildren){
 const{t}=useLocale()
 return <AppErrorBoundaryView t={t}>{children}</AppErrorBoundaryView>
}
