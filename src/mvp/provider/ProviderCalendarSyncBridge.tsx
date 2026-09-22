import{useProviderData}from'./providerData'
import{useProviderCalendarAutoSync}from'../../features/provider/hooks/useProviderCalendarAutoSync'
export function ProviderCalendarSyncBridge(){const data=useProviderData();useProviderCalendarAutoSync(data.accessToken,data.service?.id,data.service?.estado);return null}
