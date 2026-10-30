import React,{useState} from'react'
import{useLocale,LocalizedText}from'../i18n/locale'
import'./ugo-landing.css'
import{UgoSupportChat}from'./UgoSupportChat'

type LandingRole='client'|'provider'|'admin'
const goRole=(role:LandingRole)=>{window.location.assign(`${window.location.pathname}?app=${role}`)}
const jump=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})


export function UgoLanding(){
 const{t}=useLocale()
 const [serviceQuery,setServiceQuery]=useState('')
 const [serviceRegion,setServiceRegion]=useState('Florianópolis, SC')
 const searchService=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();try{sessionStorage.setItem('ugo_landing_service_intent',JSON.stringify({service:serviceQuery.trim(),region:serviceRegion.trim()}))}catch{}goRole('client')}
 const services=[['Faxina','Ambientes mais limpos e organizados.','https://images.pexels.com/photos/7513163/pexels-photo-7513163.jpeg?auto=compress&cs=tinysrgb&w=700'],['Marido de aluguel','Pequenos reparos, grandes soluções.','https://images.pexels.com/photos/7285918/pexels-photo-7285918.jpeg?auto=compress&cs=tinysrgb&w=700'],['Ar-condicionado','Instalação e manutenção com cuidado.','https://images.pexels.com/photos/33958627/pexels-photo-33958627.jpeg?auto=compress&cs=tinysrgb&w=700'],['Jardinagem','Seu jardim sempre bem cuidado.','https://images.pexels.com/photos/24595771/pexels-photo-24595771.jpeg?auto=compress&cs=tinysrgb&w=700']] as const
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
   <div className="ugo-reference-photo" aria-hidden="true"/>
   <div className="ugo-hero-glow one"/>
   <div className="ugo-hero-glow two"/>
   <div className="ugo-hero-copy">
    <div className="ugo-live-pill"><LocalizedText id="landing.livePill"/></div>
    <h1><LocalizedText id="landing.headline1"/><br/><LocalizedText id="landing.headline2"/><br/><span><LocalizedText id="landing.headline3"/></span></h1>
    <p><LocalizedText id="landing.heroIntro"/></p>
    <form className="ugo-reference-search" onSubmit={searchService} role="search">
      <label><span><LocalizedText id="landing.searchLabel"/></span><input type="search" value={serviceQuery} onChange={e=>setServiceQuery(e.target.value)} placeholder={t('landing.searchPlaceholder')} list="ugo-service-choices"/></label>
      <datalist id="ugo-service-choices"><option value="Faxina"/><option value="Marido de aluguel"/><option value="Ar-condicionado"/><option value="Jardinagem"/></datalist>
      <label><span><LocalizedText id="landing.regionLabel"/></span><input value={serviceRegion} onChange={e=>setServiceRegion(e.target.value)} placeholder={t('landing.regionPlaceholder')}/></label>
      <button type="submit"><LocalizedText id="landing.submitButton"/></button>
    </form>
    <div className="ugo-hero-actions">
     <button className="ugo-cta secondary" onClick={()=>goRole('provider')}>{t('landing.iAmPro')}</button>
    </div>
    <div className="ugo-hero-trust">
     <span><b>✓</b> {t('landing.verified')}</span>
     <span><b>✓</b> {t('landing.liveTracking')}</span>
     <span><b>✓</b> {t('landing.supportHugo')}</span>
    </div>
   </div>

   <div className="ugo-hero-demo" aria-label={t('landing.demoAria')}>
    <div className="ugo-demo-shell">
     <div className="ugo-demo-top">
      <div><small><LocalizedText id="ugoWebRemaining.brand"/></small><strong>{t('landing.demoQuestion')}</strong></div>
      <div className="ugo-avatar">SZ</div>
     </div>
     <div className="ugo-demo-search"><span>⌕</span><b>{t('landing.demoSearch')}</b></div>
     <div className="ugo-demo-map" role="img" aria-label={t('landing.demoAria')}>
      <div className="road r1"/><div className="road r2"/><div className="road r3"/>
      <div className="ugo-user-dot"><i/></div>
      <div className="ugo-pro pro1"><b>JP</b><span>8 min</span></div>
      <div className="ugo-pro pro2"><b>MC</b><span>12 min</span></div>
      <div className="ugo-pro pro3"><b>AR</b><span>15 min</span></div>
     </div>
     <div className="ugo-demo-sheet">
      <div className="ugo-hugo">
       
       <div><small>HUGO</small><strong>{t('landing.foundPros')}</strong><span>{t('landing.arrival')}</span></div>
      </div>
      <button onClick={()=>goRole('client')}>{t('landing.viewPros')} <b>→</b></button>
     </div>
    </div>
    <p className="ugo-demo-disclaimer"><LocalizedText id="landing.demoDisclaimer"/></p>
    <div className="ugo-float-card a" aria-hidden="true"><small>{t('landing.pro')}</small><strong>João P.</strong><span>{t('landing.verifiedShort')}</span></div>
    <div className="ugo-float-card b" aria-hidden="true"><small>{t('landing.status')}</small><strong>{t('landing.onTheWay')}</strong><span>ETA 8 min</span></div>
   </div>
  </section>

  <section className="ugo-marquee">
   <span><LocalizedText id="ugoWebRemaining.brand"/></span><i/> <span>{t('landing.cleaning')}</span><i/> <span>{t('landing.electricity')}</span><i/> <span>{t('landing.plumbing')}</span><i/> <span>{t('landing.repairs')}</span><i/> <span>{t('landing.assembly')}</span>
  </section>

  <section className="ugo-services" id="servicios">
   <div className="ugo-section-kicker">{t('landing.nearbyServices')}</div>
   <div className="ugo-section-title">
    <h2><LocalizedText id="landing.sectionServices"/></h2>
    <p><LocalizedText id="landing.sectionServicesIntro"/></p>
   </div>
   <div className="ugo-services-grid">
    {services.map(([title,copy,photo],i)=><button key={title} className={"ugo-service-card card-"+(i+1)} onClick={()=>goRole('client')}>
     <img className="ugo-service-photo" src={photo} alt="" loading="lazy"/><span className="ugo-service-index">0{i+1}</span>
     <div><h3>{title}</h3><p>{copy}</p></div>
     <b>↗</b>
    </button>)}
   </div>
  </section>

  <section className="ugo-how" id="como">
   <div className="ugo-how-copy">
    <div className="ugo-section-kicker light">{t('landing.navHow').toLocaleUpperCase()}</div>
    <h2><LocalizedText id="landing.howHeadline1"/><br/><LocalizedText id="landing.howHeadline2"/></h2>
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
    <h2><LocalizedText id="landing.clear"/><br/><LocalizedText id="landing.recorded"/></h2>
    <p>{t('landing.trustCopy')}</p>
    </div>
    <div className="ugo-confidence-metrics">
     <article><strong>01</strong><span><LocalizedText id="landing.step1Label"/></span></article>
     <article><strong>02</strong><span><LocalizedText id="landing.step2Label"/></span></article>
     <article><strong>03</strong><span><LocalizedText id="landing.step3Label"/></span></article>
    </div>
   </div>
  </section>

  <section className="ugo-provider" id="proveedores">
   <div className="ugo-provider-art">
    <div className="ugo-provider-phone">
     <div className="ugo-provider-head"><span>{t('landing.providerApp')}</span><b><LocalizedText id="providerRoot.online"/></b></div>
     <div className="ugo-provider-money"><small><LocalizedText id="landing.providerAppLabel"/></small><strong><LocalizedText id="landing.providerServicesLabel"/></strong><span><LocalizedText id="landing.providerDescription"/></span></div>
     <div className="ugo-provider-job"><small>{t('landing.newOpportunity')}</small><strong>{t('landing.electricalInstall')}</strong><span><LocalizedText id="landing.providerIllustrative"/></span><button type="button" onClick={()=>goRole('provider')}><LocalizedText id="landing.providerCTA"/></button></div>
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
   
   <span>{t('landing.hugoReady')}</span>
   <h2><LocalizedText id="landing.finalQuestion"/><br/><LocalizedText id="landing.finalCTA"/></h2>
   <button onClick={()=>goRole('client')}>{t('landing.startNow')} <b>→</b></button>
  </section>

  <footer className="ugo-footer">
   <div><strong>U.GO</strong><span>{t('landing.tagline')}</span></div>
   <div className="ugo-footer-links"><button onClick={()=>goRole('client')}>{t('landing.client')}</button><button onClick={()=>goRole('provider')}>{t('landing.provider')}</button><button onClick={()=>goRole('admin')}>{t('landing.admin')}</button></div>
   <small><LocalizedText id="landing.footer" params={{year:2026}}/></small>
  </footer>
  {import.meta.env.VITE_UGO_SUPPORT_CHAT_ENABLED==='true'&&<UgoSupportChat/>}
 </main>
}