import React,{createContext,useCallback,useContext,useEffect,useMemo,useState}from'react'

export type UgoLocale='es'|'pt-BR'
type Params=Record<string,string|number>
type Dictionary=Record<string,string>
const STORAGE_KEY='ugo.locale'

const es:Dictionary={
 'language.label':'Idioma','language.es':'Español','language.ptBR':'Português (Brasil)',
 'common.loading':'Abriendo UGO…','common.home':'Inicio','common.orders':'Pedidos','common.work':'Trabajo','common.profile':'Perfil',
 'provider.nav':'Navegación proveedor',
 'recovery.client':'CLIENTE','recovery.provider':'PROVEEDOR','recovery.checking':'Validando enlace…','recovery.invalid':'Enlace no válido','recovery.updated':'Contraseña actualizada','recovery.newPassword':'Creá una contraseña nueva','recovery.verifying':'Estamos verificando tu enlace seguro de recuperación.','recovery.another':'Solicitar otro enlace','recovery.enter':'Ingresar a UGO','recovery.instructions':'Usá al menos 8 caracteres. Al guardarla, cerraremos la sesión temporal del enlace.','recovery.password':'Nueva contraseña','recovery.repeat':'Repetí la contraseña','recovery.save':'Guardar contraseña','recovery.min':'La contraseña debe tener al menos 8 caracteres.','recovery.mismatch':'Las contraseñas no coinciden.','recovery.success':'Contraseña actualizada correctamente. Ya podés ingresar con la nueva contraseña.','recovery.invalidSession':'El enlace de recuperación no creó una sesión válida.','recovery.validateError':'No se pudo validar el enlace.','recovery.expired':'El enlace venció o ya fue utilizado. Solicitá uno nuevo.'
}
const ptBR:Dictionary={
 'language.label':'Idioma','language.es':'Español','language.ptBR':'Português (Brasil)',
 'common.loading':'Abrindo o UGO…','common.home':'Início','common.orders':'Pedidos','common.work':'Trabalho','common.profile':'Perfil',
 'provider.nav':'Navegação do prestador',
 'recovery.client':'CLIENTE','recovery.provider':'PRESTADOR','recovery.checking':'Validando link…','recovery.invalid':'Link inválido','recovery.updated':'Senha atualizada','recovery.newPassword':'Crie uma nova senha','recovery.verifying':'Estamos verificando seu link seguro de recuperação.','recovery.another':'Solicitar outro link','recovery.enter':'Entrar no UGO','recovery.instructions':'Use pelo menos 8 caracteres. Ao salvar, encerraremos a sessão temporária do link.','recovery.password':'Nova senha','recovery.repeat':'Repita a senha','recovery.save':'Salvar senha','recovery.min':'A senha deve ter pelo menos 8 caracteres.','recovery.mismatch':'As senhas não coincidem.','recovery.success':'Senha atualizada com sucesso. Você já pode entrar com a nova senha.','recovery.invalidSession':'O link de recuperação não criou uma sessão válida.','recovery.validateError':'Não foi possível validar o link.','recovery.expired':'O link expirou ou já foi utilizado. Solicite um novo.'
}
const dictionaries:Record<UgoLocale,Dictionary>={es,'pt-BR':ptBR}
function normalizeLocale(value?:string|null):UgoLocale{return value?.toLowerCase().startsWith('pt')?'pt-BR':'es'}
function initialLocale():UgoLocale{if(typeof window==='undefined')return'es';try{const stored=window.localStorage.getItem(STORAGE_KEY);if(stored)return normalizeLocale(stored)}catch{}return normalizeLocale(window.navigator.language)}
function interpolate(value:string,params?:Params){if(!params)return value;return value.replace(/\{(\w+)\}/g,(_,key)=>String(params[key]??`{${key}}`))}
type I18nValue={locale:UgoLocale;setLocale:(locale:UgoLocale)=>void;t:(key:string,params?:Params)=>string}
const I18nContext=createContext<I18nValue|null>(null)
export function UgoI18nProvider({children}:{children:React.ReactNode}){const[locale,setLocaleState]=useState<UgoLocale>(initialLocale);const setLocale=useCallback((next:UgoLocale)=>{setLocaleState(next);try{window.localStorage.setItem(STORAGE_KEY,next)}catch{}},[]);useEffect(()=>{document.documentElement.lang=locale},[locale]);const t=useCallback((key:string,params?:Params)=>interpolate(dictionaries[locale][key]??dictionaries.es[key]??key,params),[locale]);const value=useMemo(()=>({locale,setLocale,t}),[locale,setLocale,t]);return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>}
export function useUgoI18n(){const value=useContext(I18nContext);if(!value)throw new Error('useUgoI18n must be used inside UgoI18nProvider');return value}
export function getUgoLocale(){return initialLocale()}
export function localeTag(locale:UgoLocale){return locale==='pt-BR'?'pt-BR':'es-AR'}
