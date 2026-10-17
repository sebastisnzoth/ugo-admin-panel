import React from'react'
import{UGO_ENVIRONMENT}from'../lib/supabaseProject'
import{Badge}from'../shared/ui'

export function EnvironmentBadge(){
 if(UGO_ENVIRONMENT!=='test')return null
 return <Badge aria-label="UGO ambiente de prueba" style={{position:'fixed',top:3,right:12,zIndex:'var(--ugo-z-toast)',background:'var(--ugo-color-text)',color:'#fff',letterSpacing:'.08em',boxShadow:'var(--ugo-shadow-md)',pointerEvents:'none'}}>UGO TEST</Badge>
}
