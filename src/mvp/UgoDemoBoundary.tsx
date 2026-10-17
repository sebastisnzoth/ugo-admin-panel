import React from'react'
import{LocalizedText,useLocale}from'../i18n/locale'
import'./ugo-demo-boundary.css'

export function UgoDemoBoundary({children}:{children:React.ReactNode}){
 const{t}=useLocale()
 return <div className="ugo-demo-boundary"><div className="ugo-demo-boundary-banner" role="status" aria-label={t('demoBoundary.aria')}><strong><LocalizedText id="demoBoundary.title"/></strong><span><LocalizedText id="demoBoundary.description"/></span></div>{children}</div>
}
