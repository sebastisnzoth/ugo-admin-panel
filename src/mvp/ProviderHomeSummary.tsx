import React from 'react'
import {money} from './shared'
import './provider-home.css'

type Props={online:boolean;offers:number;active:boolean;released:number;retained:number;busy:boolean;onToggle:()=>void}

export function ProviderHomeSummary({online,offers,active,released,retained,busy,onToggle}:Props){
  return <section className="ugo-provider-home-summary" aria-label="Resumen UGO Pro">
    <div className="ugo-provider-home-copy">
      <small>UGO PRO · HOY</small>
      <h2>{online?'Listo para trabajar':'Estás fuera de línea'}</h2>
      <p>{online?(offers?`${offers} oportunidad${offers===1?'':'es'} cerca tuyo`:'UGO está buscando trabajos en tu zona'):'Ponete Online para aparecer disponible y recibir nuevas oportunidades.'}</p>
    </div>
    <button className={`ugo-provider-home-toggle ${online?'on':''}`} onClick={onToggle} disabled={busy} aria-pressed={online}>
      <span><i/>{online?'ONLINE':'OFFLINE'}</span>
      <b>{online?'Recibiendo trabajos':'Activar disponibilidad'}</b>
    </button>
    <div className="ugo-provider-home-stats">
      <div><small>OPORTUNIDADES</small><strong>{offers}</strong></div>
      <div><small>EN CURSO</small><strong>{active?'1':'0'}</strong></div>
      <div><small>LIBERADO</small><strong>{money(released)}</strong></div>
      <div><small>PROTEGIDO</small><strong>{money(retained)}</strong></div>
    </div>
  </section>
}
