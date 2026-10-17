import React from'react'
import{useLocale,LocalizedText}from'../i18n/locale'
import'./ugo-landing.css'

type LandingRole='client'|'provider'|'admin'
const goRole=(role:LandingRole)=>{window.location.assign(`${window.location.pathname}?app=${role}`)}
const jump=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})


export function UgoLanding(){
 const{t}=useLocale()
 const services=[['svcCleaning','svcCleaningCopy'],['svcElectricity','svcElectricityCopy'],['svcPlumbing','svcPlumbingCopy'],['svcRepairs','svcRepairsCopy'],['svcAssembly','svcAssemblyCopy'],['svcMore','svcMoreCopy']] as const
 return <main className="ugo-landing">
  <header className="ugo-nav">
   <button className="ugo-logo" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>U.GO</button>
   <nav>
    <button onClick={()=>jump('servicios')}>{t('landing.navServices')}</button>
    <button onClick={()=>jump('como')}>{t('landing.navHow')}</button>
    <button onClick={()=>jump('proveedores')}>{t('landing.navProfessionals')}</button>
   </nav>
   <div className="ugo-nav-actions">
    <button className="ghost" onClick={()=>goRole('client')}>{t('landing.signIn')}</button>
    <button className="solid" onClick={()=>goRole('client')}>{t('landing.requestNow')}</button>
   </div>
  </header>

  <section className="ugo-hero">
   <div className="ugo-hero-glow one"/>
   <div className="ugo-hero-glow two"/>
   <div className="ugo-hero-copy">
    <div className="ugo-live-pill"><i/> {t('landing.live')}</div>
    <h1>{t('landing.headline1')}<br/><span>{t('landing.headline2')}</span><br/>{t('landing.headline3')}</h1>
    <p>{t('landing.intro')}</p>
    <div className="ugo-hero-actions">
     <button className="ugo-cta primary" onClick={()=>goRole('client')}>{t('landing.findPro')} <b>→</b></button>
     <button className="ugo-cta secondary" onClick={()=>goRole('provider')}>{t('landing.iAmPro')}</button>
    </div>
    <div className="ugo-hero-trust">
     <span><b>✓</b> {t('landing.verified')}</span>
     <span><b>✓</b> {t('landing.liveTracking')}</span>
     <span><b>✓</b> {t('landing.supportHugo')}</span>
    </div>
   </div>

   <div className="ugo-hero-demo">
    <div className="ugo-demo-shell">
     <div className="ugo-demo-top">
      <div><small><LocalizedText id="ugoWebRemaining.brand"/></small><strong>{t('landing.demoQuestion')}</strong></div>
      <div className="ugo-avatar">SZ</div>
     </div>
     <div className="ugo-demo-search"><span>⌕</span><b>{t('landing.demoSearch')}</b></div>
     <div className="ugo-demo-map">
      <div className="road r1"/><div className="road r2"/><div className="road r3"/>
      <div className="ugo-user-dot"><i/></div>
      <div className="ugo-pro pro1"><b>JP</b><span>8 min</span></div>
      <div className="ugo-pro pro2"><b>MC</b><span>12 min</span></div>
      <div className="ugo-pro pro3"><b>AR</b><span>15 min</span></div>
     </div>
     <div className="ugo-demo-sheet">
      <div className="ugo-hugo">
       <div className="ugo-orb">H</div>
       <div><small>HUGO</small><strong>{t('landing.foundPros')}</strong><span>{t('landing.arrival')}</span></div>
      </div>
      <button onClick={()=>goRole('client')}>{t('landing.viewPros')} <b>→</b></button>
     </div>
    </div>
    <div className="ugo-float-card a"><small>{t('landing.pro')}</small><strong>João P.</strong><span>{t('landing.verifiedShort')}</span></div>
    <div className="ugo-float-card b"><small>{t('landing.status')}</small><strong>{t('landing.onTheWay')}</strong><span>ETA 8 min</span></div>
   </div>
  </section>

  <section className="ugo-marquee">
   <span><LocalizedText id="ugoWebRemaining.brand"/></span><i/> <span>{t('landing.cleaning')}</span><i/> <span>{t('landing.electricity')}</span><i/> <span>{t('landing.plumbing')}</span><i/> <span>{t('landing.repairs')}</span><i/> <span>{t('landing.assembly')}</span>
  </section>

  <section className="ugo-services" id="servicios">
   <div className="ugo-section-kicker">{t('landing.nearbyServices')}</div>
   <div className="ugo-section-title">
    <h2>{t('landing.everything')}<br/><span>{t('landing.saveTime')}</span></h2>
    <p>{t('landing.serviceIntro')}</p>
   </div>
   <div className="ugo-services-grid">
    {services.map(([title,copy],i)=><button key={title} className={"ugo-service-card card-"+(i+1)} onClick={()=>goRole('client')}>
     <span className="ugo-service-index">0{i+1}</span>
     <div><h3>{t('landing.'+title)}</h3><p>{t('landing.'+copy)}</p></div>
     <b>↗</b>
    </button>)}
   </div>
  </section>

  <section className="ugo-how" id="como">
   <div className="ugo-how-copy">
    <div className="ugo-section-kicker light">{t('landing.navHow').toLocaleUpperCase()}</div>
    <h2>{t('landing.howTitle').split('<br/>')[0]}<br/>{t('landing.howTitle').split('<br/>')[1]}</h2>
    <p>{t('landing.howCopy')}</p>
    <button onClick={()=>goRole('client')}>{t('landing.tryUgo')} <span>→</span></button>
   </div>
   <div className="ugo-how-steps">
    <article><b>01</b><div><h3>{t('landing.sayIt')}</h3><p>{t('landing.quote')}</p></div></article>
    <article><b>02</b><div><h3>{t('landing.organize')}</h3><p>{t('landing.details')}</p></div></article>
    <article><b>03</b><div><h3>{t('landing.connect')}</h3><p>{t('landing.connectCopy')}</p></div></article>
   </div>
  </section>

  <section className="ugo-confidence">
   <div className="ugo-confidence-card">
    <div className="ugo-confidence-left">
     <span>{t('landing.trust')}</span>
     <h2>{t('landing.clear')}<br/>{t('landing.recorded')}</h2>
     <p>{t('landing.trustCopy')}</p>
    </div>
    <div className="ugo-confidence-metrics">
     <article><strong>24/7</strong><span>{t('landing.tracking')}</span></article>
     <article><strong>1</strong><span>{t('landing.simpleFlow')}</span></article>
     <article><strong>✓</strong><span>{t('landing.verifiedDocs')}</span></article>
    </div>
   </div>
  </section>

  <section className="ugo-provider" id="proveedores">
   <div className="ugo-provider-art">
    <div className="ugo-provider-phone">
     <div className="ugo-provider-head"><span>{t('landing.providerApp')}</span><b><LocalizedText id="providerRoot.online"/></b></div>
     <div className="ugo-provider-money"><small>{t('landing.today')}</small><strong>R$ 486</strong><span>{t('landing.completed')}</span></div>
     <div className="ugo-provider-job"><small>{t('landing.newOpportunity')}</small><strong>{t('landing.electricalInstall')}</strong><span>2,4 km · R$ 180</span><button>{t('landing.acceptJob')}</button></div>
    </div>
   </div>
   <div className="ugo-provider-copy">
    <div className="ugo-section-kicker">{t('landing.forPros')}</div>
    <h2>{t('landing.moreWork')}<br/><span>{t('landing.lessHassle')}</span></h2>
    <p>{t('landing.proCopy')}</p>
    <button className="ugo-cta primary" onClick={()=>goRole('provider')}>{t('landing.enterAsPro')} <b>→</b></button>
   </div>
  </section>

  <section className="ugo-final">
   <div className="ugo-final-orb">H</div>
   <span>{t('landing.hugoReady')}</span>
   <h2>{t('landing.tellMe')}<br/>{t('landing.ugoHandles')}</h2>
   <button onClick={()=>goRole('client')}>{t('landing.startNow')} <b>→</b></button>
  </section>

  <footer className="ugo-footer">
   <div><strong>U.GO</strong><span>{t('landing.tagline')}</span></div>
   <div className="ugo-footer-links"><button onClick={()=>goRole('client')}>{t('landing.client')}</button><button onClick={()=>goRole('provider')}>{t('landing.provider')}</button><button onClick={()=>goRole('admin')}>{t('landing.admin')}</button></div>
   <small><LocalizedText id="landing.footer" params={{year:2026}}/></small>
  </footer>
 </main>
}
