import React from'react'
import{useLocale}from'../i18n/locale'
import{UGO_ENVIRONMENT}from'../lib/supabaseProject'
import{Badge}from'../shared/ui'

export function EnvironmentBadge(){
 const{t}=useLocale()
 if(UGO_ENVIRONMENT!=='test')return null
 return <Badge aria-label={t('environmentBadge.label')} style={{position:'fixed',top:3,right:12,zIndex:'var(--ugo-z-toast)',background:'var(--ugo-color-text)',color:'#fff',letterSpacing:'.08em',boxShadow:'var(--ugo-shadow-md)',pointerEvents:'none'}}>{t('environmentBadge.test')}</Badge>
}
