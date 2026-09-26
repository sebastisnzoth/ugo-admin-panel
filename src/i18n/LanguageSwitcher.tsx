import React from'react'
import{useUgoI18n,type UgoLocale}from'./i18n'
export function LanguageSwitcher({compact=false}:{compact?:boolean}){const{locale,setLocale,t}=useUgoI18n();return <label className={compact?'ugo-language-switcher compact':'ugo-language-switcher'}><span>{compact?'🌐':t('language.label')}</span><select aria-label={t('language.label')} value={locale} onChange={e=>setLocale(e.target.value as UgoLocale)}><option value="es">ES</option><option value="pt-BR">PT-BR</option></select></label>}
