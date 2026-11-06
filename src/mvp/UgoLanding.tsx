import React from'react'
import{useLocale,LocalizedText}from'../i18n/locale'
import'./ugo-landing.css'
import{UgoSupportChat}from'./UgoSupportChat'
import{UgoRetellVoiceWidget}from'./UgoRetellVoiceWidget'

type LandingRole='client'|'provider'|'admin'
const goRole=(role:LandingRole)=>{window.location.assign(`${window.location.pathname}?app=${role}`)}
const jump=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})


export function UgoLanding(){
 const{t,locale,setLocale}=useLocale()
 const services=[['landing.svcCleaning','landing.svcCleaningCopy','https://images.pexels.com/photos/7513163/pexels-photo-7513163.jpeg?auto=compress&cs=tinysrgb&w=700'],['landing.svcRepairs','landing.svcRepairsCopy','https://images.pexels.com/photos/7285918/pexels-photo-7285918.jpeg?auto=compress&cs=tinysrgb&w=700'],['landing.airConditioning','landing.airConditioningCopy','https://images.pexels.com/photos/33958627/pexels-photo-33958627.jpeg?auto=compress&cs=tinysrgb&w=700'],['landing.gardening','landing.gardeningCopy','https://images.pexels.com/photos/24595771/pexels-photo-24595771.jpeg?auto=compress&cs=tinysrgb&w=700']] as const
 return <main className="ugo-landing">
  <header className="ugo-nav">
   <button className="ugo-logo" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>U.GO</button>
   <nav>
    <button onClick={()=>jump('servicios')}>{t('landing.navServices')}</button>
    <button onClick={()=>jump('como')}>{t('landing.navHow')}</button>
    <button onClick={()=>jump('proveedores')}>{t('landing.navProfessionals')}</button>
   </nav>
   <div className="ugo-nav-actions">
    <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600}}>{t("language.label")}<select aria-label={t("language.label")} value={locale} onChange={e=>setLocale(e.target.value as "pt-BR"|"es"|"en")} style={{border:"1px solid #b9c9c0",borderRadius:8,padding:"7px",background:"#fff",color:"#163b2a"}}><option value="pt-BR">PT</option><option value="es">ES</option><option value="en">EN</option></select></label>
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
    <h1><LocalizedText id="landing.directHeadline"/> <span><LocalizedText id="landing.directHeadlineAccent"/></span></h1>
    <p><LocalizedText id="landing.heroIntro"/></p>
    <div className="ugo-hero-actions">
     <button className="ugo-cta primary" onClick={()=>goRole('client')}>{t('landing.requestNow')} <b aria-hidden="true">↗</b></button>
     <button className="ugo-cta secondary" onClick={()=>goRole('provider')}>{t('landing.iAmPro')} <b aria-hidden="true">→</b></button>
    </div>
    <p className="ugo-hero-note">{t('landing.availabilityNote')}</p>
    <div className="ugo-hero-trust">
     <span><b>✓</b> {t('landing.trustDocumentShort')}</span>
     <span><b>✓</b> {t('landing.liveTracking')}</span>
     <span><b>✓</b> {t('landing.trustPriceShort')}</span>
    </div>
   </div>


  </section>

  <section className="ugo-marquee">
   <span><LocalizedText id="ugoWebRemaining.brand"/></span><i/> <span>{t('landing.cleaning')}</span><i/> <span>{t('landing.electricity')}</span><i/> <span>{t('landing.plumbing')}</span><i/> <span>{t('landing.repairs')}</span><i/> <span>{t('landing.assembly')}</span>
  </section>

  <section className="ugo-services" id="servicios">
   <div className="ugo-section-kicker">{t('landing.nearbyServices')}</div>
   <div className="ugo-section-title">
    <h2><LocalizedText id="landing.exploreServices"/></h2>
    <p><LocalizedText id="landing.categoriesHelp"/></p>
   </div>
   <div className="ugo-services-grid">
    {services.map(([title,copy,photo],i)=><article key={title} className={"ugo-service-card card-"+(i+1)}>
     <img className="ugo-service-photo" src={photo} alt="" loading="lazy"/><span className="ugo-service-index">0{i+1}</span>
     <div><h3>{t(title)}</h3><p>{t(copy)}</p></div>
    </article>)}
   </div>
   <button type="button" className="ugo-services-cta" onClick={()=>goRole('client')}>{t('landing.openClientApp')} <span aria-hidden="true">→</span></button>
  </section>

  <section className="ugo-how" id="como">
   <div className="ugo-how-copy">
    <div className="ugo-section-kicker light">{t('landing.navHow').toLocaleUpperCase()}</div>
    <h2><LocalizedText id="landing.howHeadline1"/><br/><LocalizedText id="landing.howHeadline2"/></h2>
    <p>{t('landing.howHonestCopy')}</p>
    <button onClick={()=>goRole('client')}>{t('landing.tryUgo')} <span>→</span></button>
   </div>
   <div className="ugo-how-steps">
    <article><b>01</b><div><h3>{t('landing.howStepOne')}</h3><p>{t('landing.howStepOneCopy')}</p></div></article>
    <article><b>02</b><div><h3>{t('landing.howStepTwo')}</h3><p>{t('landing.howStepTwoCopy')}</p></div></article>
    <article><b>03</b><div><h3>{t('landing.howStepThree')}</h3><p>{t('landing.howStepThreeCopy')}</p></div></article>
   </div>
  </section>

  <section className="ugo-confidence">
   <div className="ugo-confidence-card">
    <div className="ugo-confidence-left">
     <span>{t('landing.trust')}</span>
    <h2><LocalizedText id="landing.clear"/><br/><LocalizedText id="landing.recorded"/></h2>
    <p>{t('landing.trustHonestCopy')}</p>
    </div>
    <div className="ugo-confidence-metrics">
     <article><strong aria-hidden="true">✓</strong><h3>{t('landing.trustDocuments')}</h3><p>{t('landing.trustDocumentsCopy')}</p></article>
     <article><strong aria-hidden="true">↗</strong><h3>{t('landing.trustTracking')}</h3><p>{t('landing.trustTrackingCopy')}</p></article>
     <article><strong aria-hidden="true">$</strong><h3>{t('landing.trustPrice')}</h3><p>{t('landing.trustPriceCopy')}</p></article>
    </div>
   </div>
  </section>

  <section className="ugo-provider" id="proveedores">
   <div className="ugo-provider-art" aria-hidden="true">
    <div className="ugo-provider-art-label">UGO PRO <span>✳</span></div>
    <div className="ugo-provider-phone">
     <div className="ugo-provider-head"><span>UGO PRO</span><b><LocalizedText id="providerRoot.online"/></b></div>
     <div className="ugo-provider-money"><small><LocalizedText id="landing.providerAppLabel"/></small><strong><LocalizedText id="landing.providerServicesLabel"/></strong><span><LocalizedText id="landing.providerDescription"/></span></div>
     <div className="ugo-provider-job"><small>{t('landing.newOpportunity')}</small><strong>{t('landing.electricalInstall')}</strong><span><LocalizedText id="landing.providerIllustrative"/></span><div className="ugo-provider-job-tag">{t('landing.providerIllustrative')} <span>↗</span></div></div>
    </div>
    <div className="ugo-provider-art-caption">{t('landing.providerIllustrative')}</div>
   </div>
   <div className="ugo-provider-copy">
    <div className="ugo-section-kicker">{t('landing.forPros')}</div>
    <h2>{t('landing.moreWork')}<br/><span>{t('landing.lessHassle')}</span></h2>
    <p>{t('landing.proCopy')}</p>
    <ul className="ugo-provider-benefits">
     <li><span aria-hidden="true">↗</span><div><strong>{t('landing.proBenefitRequests')}</strong><small>{t('landing.proBenefitRequestsCopy')}</small></div></li>
     <li><span aria-hidden="true">▦</span><div><strong>{t('landing.proBenefitManage')}</strong><small>{t('landing.proBenefitManageCopy')}</small></div></li>
    </ul>
    <button type="button" className="ugo-cta primary" onClick={()=>goRole('provider')}>{t('landing.enterAsPro')} <b aria-hidden="true">→</b></button>
    <small className="ugo-provider-cta-note">{t('landing.proAccessNote')}</small>
   </div>
  </section>

  <section className="ugo-final">
   <div className="ugo-final-inner">
    <div className="ugo-final-copy">
     <span className="ugo-final-kicker">{t('landing.livePill')}</span>
     <h2><LocalizedText id="landing.finalQuestion"/><br/><LocalizedText id="landing.finalCTA"/></h2>
     <p>{t('landing.finalHelp')}</p>
     <button type="button" onClick={()=>goRole('client')}>{t('landing.startNow')} <b aria-hidden="true">→</b></button>
     <small>{t('landing.availabilityNote')}</small>
    </div>
    <span className="ugo-final-image-note">{t('landing.finalImageNote')}</span>
   </div>
  </section>

  <footer className="ugo-footer">
   <div><strong>U.GO</strong><span>{t('landing.tagline')}</span></div>
   <div className="ugo-footer-links"><button onClick={()=>goRole('client')}>{t('landing.client')}</button><button onClick={()=>goRole('provider')}>{t('landing.provider')}</button><button onClick={()=>goRole('admin')}>{t('landing.admin')}</button></div>
   <small><LocalizedText id="landing.footer" params={{year:new Date().getFullYear()}}/></small>
  </footer>
  {import.meta.env.VITE_UGO_SUPPORT_CHAT_ENABLED==='true'&&<UgoSupportChat/>}
  <UgoRetellVoiceWidget/>
 </main>
}