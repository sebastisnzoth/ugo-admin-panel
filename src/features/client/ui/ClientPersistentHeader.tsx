type Props={onHome:()=>void}
export function ClientPersistentHeader({onHome}:Props){
 const openMenu=()=>document.querySelector<HTMLButtonElement>('.ugo-client-global-trigger')?.click()
 return <div className="ugo-client-persistent-header" aria-label="Cabecera UGO"><button type="button" className="ugo-client-header-menu" onClick={openMenu} aria-label="Abrir menú">☰</button><button type="button" className="ugo-client-header-logo" onClick={onHome} aria-label="Ir al inicio">UG<span>O</span></button></div>
}
