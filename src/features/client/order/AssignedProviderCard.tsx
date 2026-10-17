import{useLocale}from'../../../i18n/locale'
import React,{useEffect,useState} from 'react'
import{getRoleSupabase}from'../../../lib/roleSupabase'
import {UserProfileAvatar} from '../../../mvp/UserProfileAvatar'
import './AssignedProviderCard.css'

export type AssignedProviderProfile={
 nombre?:string|null
 karma?:number|null
 servicios_completados?:number|null
 foto_url?:string|null
}
export function AssignedProviderCard({provider,providerId,category,onOpen,compact=false}:{provider:AssignedProviderProfile|null|undefined;providerId?:string|null;category?:string|null;onOpen?:()=>void;compact?:boolean}){
 const{t}=useLocale();
 const[portfolio,setPortfolio]=useState<Array<{name:string;url:string}>>([])
 useEffect(()=>{if(!providerId){setPortfolio([]);return}let alive=true;const db=getRoleSupabase('client');void db.storage.from('provider-public').list(`${providerId}/portfolio`,{limit:4,sortBy:{column:'created_at',order:'desc'}}).then(({data,error})=>{if(!alive||error)return;setPortfolio((data||[]).filter(f=>/\.(jpe?g|png|webp)$/i.test(f.name)).map(f=>({name:f.name,url:db.storage.from('provider-public').getPublicUrl(`${providerId}/portfolio/${f.name}`).data.publicUrl}))) }).catch(()=>{});return()=>{alive=false}},[providerId])
 if(!provider)return null
 const rating=Number(provider.karma)
 const hasRating=provider.karma!=null&&Number.isFinite(rating)&&rating>0
 const completed=Number(provider.servicios_completados)
 const hasCompleted=provider.servicios_completados!=null&&Number.isFinite(completed)&&completed>=0
 return <section className={`ugo-assigned-provider-card${compact?' is-compact':''}`} aria-label={t('clientAssigned.label')}>
  <header className="ugo-assigned-provider-heading">
   <div><span className="ugo-assigned-provider-eyebrow">{t('screen.client_card.1')}</span><strong>{t('screen.client_card.2')}</strong></div>
   <span className="ugo-assigned-provider-status"><i aria-hidden="true">✓</i>{t('clientAssigned.status')}</span>
  </header>
  <div className="ugo-assigned-provider-main">
   <div className="ugo-assigned-provider-photo-wrap"><UserProfileAvatar name={provider.nombre||t('clientHome.professional')} role="provider" photoUrl={provider.foto_url||null} size={72} className="ugo-assigned-provider-photo"/><span aria-hidden="true" className="ugo-assigned-provider-photo-check">✓</span></div>
   <div className="ugo-assigned-provider-identity"><h3>{provider.nombre||t('clientHome.professional')}</h3><p>{category||t('clientAssigned.homeServices')}</p><span className="ugo-assigned-provider-membership">{t('screen.client_card.4')}</span></div>
  </div>
  <div className="ugo-assigned-provider-stats" aria-label={t('clientAssigned.reputation')}>
   <div><strong>{hasRating?`★ ${rating.toFixed(1)}`:t('clientAssigned.unrated')}</strong><span>{t('screen.client_card.5')}</span></div>
   <div><strong>{hasCompleted?completed:'—'}</strong><span>{t('screen.client_card.6')}</span></div>
  </div>
  {portfolio.length>0&&<div className="ugo-assigned-provider-portfolio"><strong>{t('screen.client_card.7')}</strong><div>{portfolio.map(p=><figure key={p.name}><img src={p.url} alt={t('clientAssigned.projectAlt',{name:p.name.replace(/^\d+_/,'').replace(/\.[^.]+$/,'').replaceAll('-',' ')})} loading="lazy"/></figure>)}</div></div>}
  {onOpen&&<button type="button" onClick={onOpen}>{t('clientAssigned.openTracking')} <span aria-hidden="true">→</span></button>}
 </section>
}
