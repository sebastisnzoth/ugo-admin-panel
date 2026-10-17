import React,{useCallback,useEffect,useState}from'react'
import{useLocale}from'../i18n/locale'
import{useDialog}from'./dialogs'

type Props={accessToken:string}
type Status={connected:boolean;mpUserId?:string|null;expiresAt?:string|null;liveMode?:boolean|null;connectedAt?:string|null;configured?:boolean}

export function ProviderMercadoPagoConnect({accessToken}:Props){
 const{t,locale}=useLocale()
 const[status,setStatus]=useState<Status>({connected:false}),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
const{confirm,node:dialog}=useDialog()
 const call=useCallback(async(action:'status'|'connect'|'disconnect')=>{const r=await fetch('/api/test?mp_oauth=1',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({action})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||t('providerMp.requestFailed'));return data},[accessToken,t])
 const load=useCallback(()=>call('status').then(setStatus).catch(e=>setMessage(e.message)),[call])
 useEffect(()=>{load();const params=new URLSearchParams(window.location.search),mp=params.get('mp');if(mp){setMessage(mp==='connected'?t('providerMp.linked'):mp==='invalid_state'?t('providerMp.authorizationExpired'):t('providerMp.linkFailed'));const clean=new URL(window.location.href);clean.searchParams.delete('mp');window.history.replaceState({},'',clean.toString())}},[load,t])
 async function connect(){setBusy(true);setMessage('');try{const data=await call('connect');if(!data.authorizationUrl)throw new Error(t('providerMp.urlMissing'));window.location.assign(data.authorizationUrl)}catch(e){setMessage(e instanceof Error?e.message:t('providerMp.connectFailed'));setBusy(false)}}
 async function disconnect(){if(!await confirm({title:t('providerMp.disconnect'),message:t('providerMp.disconnectConfirm'),danger:true}))return;setBusy(true);setMessage('');try{await call('disconnect');await load();setMessage(t('providerMp.disconnected'))}catch(e){setMessage(e instanceof Error?e.message:t('providerMp.disconnectFailed'))}finally{setBusy(false)}}
 return <div style={{marginTop:16,padding:14,borderRadius:18,background:'#f7f9fa'}}><strong>{t('providerMp.title')}</strong><p style={{fontSize:12,lineHeight:1.45,color:'#647269',margin:'6px 0 12px'}}>{t('providerMp.description')}</p>{status.connected?<><div style={{fontSize:13}}>✅ {t('providerMp.connected')}{status.mpUserId?` · ID ${status.mpUserId}`:''}</div>{status.connectedAt&&<small style={{display:'block',marginTop:4,opacity:.65}}>{t('providerMp.since')} {new Date(status.connectedAt).toLocaleString(locale)}</small>}<button type="button" className="mvp-voice-btn" onClick={disconnect} disabled={busy} style={{marginTop:10}}>{t('providerMp.disconnect')}</button></>:<button type="button" className="mvp-voice-btn" onClick={connect} disabled={busy||status.configured===false}>{busy?t('providerMp.opening'):t('providerMp.connect')}</button>}{status.configured===false&&<p style={{fontSize:11,color:'#b42318'}}>{t('providerMp.notConfigured')}</p>}{message&&<div style={{fontSize:12,marginTop:8}}>{message}</div>}{dialog}</div>
}
