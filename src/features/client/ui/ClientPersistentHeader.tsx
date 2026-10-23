import{useLocale}from'../../../i18n/locale'
const OPEN_CLIENT_MENU_EVENT='ugo:client-menu-open'
type Props={onHome:()=>void}
export function ClientPersistentHeader({onHome}:Props){
 const{t}=useLocale()
 const openMenu=()=>window.dispatchEvent(new Event(OPEN_CLIENT_MENU_EVENT))
 return <div className="ugo-client-persistent-header" aria-label={t('clientHeader.label')}><button type="button" className="ugo-client-header-menu" onClick={openMenu} aria-label={t('clientHeader.openMenu')}>☰</button><button type="button" className="ugo-client-header-logo" onClick={onHome} aria-label={t('clientHeader.home')}><span className="ugo-client-brand-u">U</span><span className="ugo-client-brand-go">GO</span></button></div>
}
