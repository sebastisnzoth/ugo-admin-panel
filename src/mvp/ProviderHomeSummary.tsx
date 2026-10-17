import React from 'react'
import {useLocale} from '../i18n/locale'
import {money} from './shared'
import './provider-home.css'

type Props={online:boolean;offers:number;active:boolean;released:number;retained:number;busy:boolean;onToggle:()=>void}

export function ProviderHomeSummary({online,offers,active,released,retained,busy,onToggle}:Props){
  const{t}=useLocale()
  const demand=online?(offers?t('providerScreen.nearbyOffers',{count:offers}):t('providerScreen.noOffers')):t('providerScreen.offlineOffers')
  return <section className="ugo-provider-home-summary" aria-label={t('providerScreen.demandAvailability')}>
    <div className="ugo-provider-home-head">
      <div className="ugo-provider-home-copy">
        <span className={`ugo-provider-presence ${online?'on':''}`}><i/>{online?t('providerScreen.available'):t('providerScreen.unavailable')}</span>
        <h2>{online?(offers?t('providerScreen.workNearby'):t('providerScreen.radarActive')):t('providerScreen.offline')}</h2>
        <p>{demand}</p>
      </div>
      <button className={`ugo-provider-home-toggle ${online?'on':''}`} onClick={onToggle} disabled={busy} aria-pressed={online}>
        <span><i/>{online?t('providerScreen.online'):t('providerScreen.offlineStatus')}</span>
        <b>{busy?t('providerScreen.updating'):online?t('providerScreen.pause'):t('providerScreen.activate')}</b>
      </button>
    </div>
    <div className="ugo-provider-home-demand" aria-label={t('providerHome.operational')}>
      <div><span>{t('providerScreen.opportunities')}</span><strong>{offers}</strong></div>
      <div><span>{t('providerScreen.activeService')}</span><strong>{active?t('providerScreen.inProgress'):t('providerScreen.free')}</strong></div>
      <div><span>{t('providerScreen.releasedBalance')}</span><strong>{money(released)}</strong></div>
      <div><span>{t('providerScreen.protected')}</span><strong>{money(retained)}</strong></div>
    </div>
  </section>
}
