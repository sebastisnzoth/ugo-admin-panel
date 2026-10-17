import React from 'react'
import{reportSentinelIncident}from'../lib/sentinel'
import{LocalizedText}from'../i18n/locale'

type Props={children:React.ReactNode;role?:'client'|'provider'|'admin';serviceId?:string|null;checklistCode?:string|null;action?:string|null;severity?:'P0'|'P1'|'P2'|'P3';title?:string;compact?:boolean;onClose?:()=>void}
type State={error:Error|null}

export class SentinelErrorBoundary extends React.Component<Props,State>{
 state:State={error:null}
 static getDerivedStateFromError(error:Error){return{error}}
 componentDidCatch(error:Error,info:React.ErrorInfo){
  void reportSentinelIncident({eventType:'module_render_error',message:error.message||'Un módulo del servicio no pudo renderizarse',error,role:this.props.role||'unknown',severity:this.props.severity||'P1',serviceId:this.props.serviceId,action:this.props.action,checklistCode:this.props.checklistCode,metadata:{componentStack:info.componentStack||''}})
 }
 render(){
  if(!this.state.error)return this.props.children
  return <section className={this.props.compact?'ugo-history-panel embedded':'ugo-history-panel embedded'} style={{padding:16,display:'grid',gap:10}} role="alert">
   <strong>{this.props.title||<LocalizedText id="uiCopy.expression192"/>}</strong>
   <p style={{margin:0}}><LocalizedText id="sentinelBoundary.description"/></p>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" className="ugo-guided-primary" onClick={()=>this.setState({error:null})}><LocalizedText id="sentinelBoundary.retry"/></button>{this.props.onClose&&<button type="button" className="ugo-history-cancel-button" onClick={this.props.onClose}><LocalizedText id="sentinelBoundary.back"/></button>}</div>
  </section>
 }
}
