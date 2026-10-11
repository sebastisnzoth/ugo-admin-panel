import React from'react'

/** Anuncia el cambio de pantalla a lectores de pantalla sin romper el layout. */
export function ScreenAnnouncer({label}:{label:string}){
 return <div className="ugo-ux-sr-only" role="status" aria-live="polite" aria-atomic="true">{label}</div>
}
