import React from 'react'
import {useLocale,type UgoLocale} from './locale'
export function LanguageSelector(){
 const{locale,setLocale,t}=useLocale()
 return <label className="ugo-language-inline"><span>{t('language.label')}</span><select data-testid="language-selector" value={locale} onChange={event=>setLocale(event.target.value as UgoLocale)}><option value="pt-BR">{t('language.portuguese')}</option><option value="es">{t('language.spanish')}</option><option value="en">{t('language.english')}</option></select></label>
}
