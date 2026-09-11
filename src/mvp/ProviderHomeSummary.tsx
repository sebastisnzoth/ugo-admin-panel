import React from 'react'
import {money} from './shared'
import './provider-home.css'

type Props={online:boolean;offers:number;active:boolean;released:number;retained:number;busy:boolean;onToggle:()=>void}

export function ProviderHomeSummary({online,offers,active,released,retained,busy,onToggle}:Props){
  const demand=online?(offers?`${offers} oportunidad${offers===1?'':'es'} cerca tuyo`:'Sin oportunidades nuevas por ahora'):'No recibís oportunidades mientras estás fuera de línea'
  return <section className="ugo-provider-home-summary" aria-label="Demanda y disponibilidad">
    <div className="ugo-provider-home-head">
      <div className="ugo-provider-home-copy">
        <span className={`ugo-provider-presence ${online?'on':''}`}><i/>{online?'Disponible':'No disponible'}</span>
        <h2>{online?(offers?'Hay trabajo cerca':'Tu radar está activo'):'Estás fuera de línea'}</h2>
        <p>{demand}</p>
      </div>
      <button className={`ugo-provider-home-toggle ${online?'on':''}`} onClick={onToggle} disabled={busy} aria-pressed={online}>
        <span><i/>{online?'Online':'Offline'}</span>
        <b>{busy?'Actualizando…':online?'Pausar':'Activar'}</b>
      </button>
    </div>
    <div className="ugo-provider-home-demand" aria-label="Estado operativo">
      <div><span>Oportunidades</span><strong>{offers}</strong></div>
      <div><span>Servicio activo</span><strong>{active?'En curso':'Libre'}</strong></div>
      <div><span>Saldo liberado</span><strong>{money(released)}</strong></div>
      <div><span>Protegido</span><strong>{money(retained)}</strong></div>
    </div>
  </section>
}
