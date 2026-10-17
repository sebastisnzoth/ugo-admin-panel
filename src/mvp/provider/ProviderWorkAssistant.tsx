import React from'react'
import{useLocale}from'../../i18n/locale'
import type{Service}from'../shared'
import{Card,StatusPill}from'../../shared/ui'

type Props={service:Service;funded:boolean;cashSelected:boolean;cashConfirmed:boolean;initialEvidence:boolean;finalEvidence:boolean}
type AssistantStage={title:string;summary:string;items:string[];tone:'ready'|'attention'|'working'|'done'}

function buildStage({service,funded,cashSelected,cashConfirmed,initialEvidence,finalEvidence}:Props,t:(key:string)=>string):AssistantStage{
 const paymentReady=funded||cashSelected
 const msg=(key:string)=>t(`providerAssistant.${key}`)
 if(service.estado==='asignado')return paymentReady?{title:msg('assigned.title'),summary:msg(cashSelected?'assigned.cashSummary':'assigned.cardSummary'),items:['assigned.item1','assigned.item2','assigned.item3'].map(msg),tone:'ready'}:{title:msg('payment.title'),summary:msg('payment.summary'),items:['payment.item1','payment.item2','payment.item3'].map(msg),tone:'attention'}
 if(service.estado==='en_camino')return{title:msg('enRoute.title'),summary:msg('enRoute.summary'),items:['enRoute.item1','enRoute.item2','enRoute.item3'].map(msg),tone:'working'}
 if(service.estado==='llegado')return{title:msg('arrived.title'),summary:msg(initialEvidence?'arrived.ready':'arrived.missing'),items:[msg(initialEvidence?'arrived.photoReady':'arrived.photoMissing'),msg('arrived.item2'),msg('arrived.item3')],tone:initialEvidence?'ready':'attention'}
 if(service.estado==='en_progreso')return{title:msg('progress.title'),summary:msg(finalEvidence?'progress.final':'progress.working'),items:[msg('progress.item1'),msg('progress.item2'),msg(finalEvidence?'progress.finalItem':'progress.afterItem'),msg(cashSelected&&!cashConfirmed?'progress.cashPending':'progress.cashOther')],tone:finalEvidence?'ready':'working'}
 if(service.estado==='esperando_aprobacion')return{title:msg('approval.title'),summary:msg(cashSelected&&!cashConfirmed?'approval.cashSummary':'approval.summary'),items:[msg(cashSelected&&!cashConfirmed?'approval.cashItem':'approval.item1'),msg('approval.item2'),msg('approval.item3')],tone:cashSelected&&!cashConfirmed?'attention':'done'}
 return{title:msg('default.title'),summary:msg('default.summary'),items:[msg('default.item')],tone:'done'}
}

export function ProviderWorkAssistant(props:Props){
 const{t}=useLocale()
 const stage=buildStage(props,t)
 return <Card className={`provider-hugo-assistant is-${stage.tone}`} aria-labelledby="provider-hugo-title"><header><div className="provider-hugo-orb" aria-hidden="true">H</div><div><StatusPill tone={stage.tone==='attention'?'danger':stage.tone==='done'?'success':'neutral'}>{t('providerAssistant.label')}</StatusPill><h2 id="provider-hugo-title">{stage.title}</h2></div></header><p>{stage.summary}</p><ul>{stage.items.map((item,index)=><li key={index}>{item}</li>)}</ul><footer>{t('providerAssistant.footer')}</footer></Card>
}
