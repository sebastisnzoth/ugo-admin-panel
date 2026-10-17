import{useLocale}from'../../i18n/locale'
import React,{useCallback,useEffect,useState}from'react'
import{useProviderData}from'./providerData'
import{disconnectProviderCalendar,getProviderCalendarStatus,startProviderCalendar,syncProviderCalendar,type ProviderCalendarStatus}from'./providerCalendar'
import{Button,Card,LoadingState,StatusPill}from'../../shared/ui'
import{useDialog}from'../dialogs'

const empty:ProviderCalendarStatus={configured:false,connected:false,email:null,calendarId:null,updatedAt:null}
export function ProviderCalendarIntegration(){
 const{t}=useLocale();
 const d=useProviderData(),[status,setStatus]=useState<ProviderCalendarStatus>(empty),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
const{confirm,node:dialog}=useDialog()
 const load=useCallback(async()=>{if(!d.accessToken)return;setLoading(true);try{setStatus(await getProviderCalendarStatus(d.accessToken))}catch(error){setMessage(error instanceof Error?error.message:'No pudimos leer Google Calendar.')}finally{setLoading(false)}},[d.accessToken])
 useEffect(()=>{void load()},[load])
 const connect=async()=>{if(!d.accessToken||busy)return;setBusy(true);setMessage('');try{const{url}=await startProviderCalendar(d.accessToken);window.location.assign(url)}catch(error){setMessage(error instanceof Error?error.message:'No pudimos iniciar la conexión.');setBusy(false)}}
 const sync=async()=>{if(!d.accessToken||busy)return;setBusy(true);setMessage('');try{const result=await syncProviderCalendar(d.accessToken);setMessage(t('providerCalendar.syncResult',{created:result.created,updated:result.updated,deleted:result.deleted}));await load()}catch(error){setMessage(error instanceof Error?error.message:t('providerCalendar.syncFailed'))}finally{setBusy(false)}}
 const disconnect=async()=>{if(!d.accessToken||busy)return;if(!await confirm({title:'Desconectar Google Calendar',message:'¿Desconectar Google Calendar? UGO dejará de reflejar nuevos cambios y retirará los eventos UGO que administra.',danger:true}))return;setBusy(true);setMessage('');try{await disconnectProviderCalendar(d.accessToken);setStatus(empty);setMessage('Google Calendar desconectado.')}catch(error){setMessage(error instanceof Error?error.message:'No pudimos desconectar Google Calendar.')}finally{setBusy(false)}}
 if(loading)return <Card className="provider-calendar-box"><LoadingState label="Verificando Google Calendar…"/></Card>
 if(!status.configured)return <Card className="provider-calendar-box"><StatusPill tone="warning">{t('screen.provider_calendar.1')}</StatusPill><p>{t('screen.provider_calendar.2')}</p></Card>
 return <Card className="provider-calendar-box">
  {status.connected?<><p><strong>{t('providerCalendar.connected')}</strong>{status.email&&<><br/><span>{status.email}</span></>}</p><p>{t('providerCalendar.sourceOfTruth')}</p><div className="provider-calendar-actions"><Button variant="secondary" disabled={busy} onClick={()=>void sync()}>{busy?t('providerCalendar.syncing'):t('providerCalendar.sync')}</Button><Button variant="danger" className="danger" disabled={busy} onClick={()=>void disconnect()}>{t('screen.provider_calendar.4')}</Button></div></>:<><p>{t('screen.provider_calendar.5')}</p><Button variant="primary" disabled={busy} onClick={()=>void connect()}>{busy?t('providerCalendar.opening'):t('providerCalendar.connect')}</Button></>}
  {message&&<p className="provider-calendar-message" role="status">{message}</p>}
  {dialog}
 </Card>
}
