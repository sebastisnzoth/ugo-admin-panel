const OPEN_CLIENT_MENU_EVENT='ugo:client-menu-open'
type Props={onHome:()=>void}
export function ClientPersistentHeader({onHome}:Props){
 const openMenu=()=>window.dispatchEvent(new Event(OPEN_CLIENT_MENU_EVENT))
 return <div className="ugo-client-persistent-header" aria-label="Cabecera UGO"><button type="button" className="ugo-client-header-menu" onClick={openMenu} aria-label="Abrir menú">☰</button><button type="button" className="ugo-client-header-logo" onClick={onHome} aria-label="Ir al inicio">UG<span>O</span></button></div>
}
