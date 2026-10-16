import React from 'react'
type Name='active'|'home'|'explore'|'request'|'history'|'payments'|'profile'|'notifications'|'menu'|'location'|'help'|'arrow'
const paths:Record<Name,React.ReactNode>={
 active:<><path d="M12 21s7-6.2 7-13a7 7 0 0 0-14 0c0 6.8 7 13 7 13Z"/><circle cx="12" cy="8" r="2.5"/></>,
 home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-7h6v7"/></>,
 explore:<><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></>,
 request:<><path d="M12 5v14M5 12h14"/></>,
 history:<><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 2"/></>,
 payments:<><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h3"/></>,
 profile:<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></>,
 notifications:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10"/><path d="M10 22h4"/></>,
 menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
 location:<><path d="M12 22s7-6.2 7-13a7 7 0 0 0-14 0c0 6.8 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></>,
 help:<><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2.3c-1.3 1-2 1.5-2 3.1M12 18h.01"/></>,
 arrow:<><path d="M5 12h14M12 5l7 7-7 7"/></>,
}
export function ClientZipIcon({name,size=21}:{name:Name;size?:number}){
 return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}
