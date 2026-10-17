import React from 'react'
import {UserProfileAvatar} from '../../../mvp/UserProfileAvatar'
import './AssignedProviderCard.css'

export type AssignedProviderProfile={
 nombre?:string|null
 karma?:number|null
 servicios_completados?:number|null
 foto_url?:string|null
}
export function AssignedProviderCard({provider,category,onOpen,compact=false}:{provider:AssignedProviderProfile|null|undefined;category?:string|null;onOpen?:()=>void;compact?:boolean}){
 if(!provider)return null
 const rating=Number(provider.karma),completed=provider.servicios_completados
 const hasRating=provider.karma!==null&&provider.karma!==undefined&&Number.isFinite(rating)&&rating>0
 return <section className={`ugo-assigned-provider-card${compact?' is-compact':''}`} aria-label="Ficha del profesional asignado">
  <div className="ugo-assigned-provider-heading"><span>PROFESIONAL ASIGNADO</span><strong>✓ Asignación confirmada</strong></div>
  <div className="ugo-assigned-provider-main">
   <UserProfileAvatar name={provider.nombre||'Profesional UGO'} role="provider" photoUrl={provider.foto_url||null} size={58} className="ugo-assigned-provider-photo"/>
   <div className="ugo-assigned-provider-identity"><h3>{provider.nombre||'Profesional UGO'}</h3><p>{category||'Servicios para el hogar'}</p></div>
  </div>
  <div className="ugo-assigned-provider-stats">
   <div><strong>{hasRating?`★ ${rating.toFixed(1)}`:'★ —'}</strong><span>Calificación</span></div>
   <div><strong>{typeof completed==='number'?completed:'—'}</strong><span>Servicios realizados</span></div>
   <div><strong>UGO</strong><span>Profesional asignado</span></div>
  </div>
  {onOpen&&<button type="button" onClick={onOpen}>Ver pedido y seguimiento <span aria-hidden="true">→</span></button>}
 </section>
}
