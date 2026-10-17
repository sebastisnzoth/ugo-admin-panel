import{useLocale}from'../../../i18n/locale'
import{useClientFlow}from'../flow/clientFlow'
import'./clientSupportScreen.css'

export function ClientSupportScreen(){
 const{t}=useLocale()
 const flow=useClientFlow()
 return <main className="ugo-client-support-screen" aria-label={t('screen.support.1')}>
  <header><button type="button" onClick={()=>flow.navigate('home')} aria-label={t('screen.support.2')}>←</button><div><small>{t('screen.support.3')}</small><h1>{t('screen.support.1')}</h1></div></header>
  <section>
   <div className="ugo-client-support-intro"><span>?</span><div><h2>{t('screen.support.4')}</h2><p>{t('screen.support.5')}</p></div></div>
   <div className="ugo-client-support-actions">
    <button type="button" onClick={()=>flow.navigate('history')}><span>◷</span><div><b>{t('screen.support.6')}</b><small>{t('screen.support.7')}</small></div><i>→</i></button>
    <button type="button" onClick={()=>flow.navigate('profile')}><span>◉</span><div><b>{t('screen.support.8')}</b><small>{t('screen.support.9')}</small></div><i>→</i></button>
   </div>
   <aside><b>{t('screen.support.10')}</b><p>{t('screen.support.11')}</p></aside>
  </section>
 </main>
}
export default ClientSupportScreen
