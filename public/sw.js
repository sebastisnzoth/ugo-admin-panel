self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch{payload={body:event.data?.text()||''}}
  const expiresAt=payload?.data?.expira_at;
  if(payload.type==='nueva_oferta'&&typeof expiresAt==='string'){
    const expiry=Date.parse(expiresAt);
    if(Number.isFinite(expiry)&&expiry<=Date.now())return;
  }
  const title=payload.title||'U.GO';
  const appBase=new URL('./',self.registration.scope);
  const role=payload?.data?.role;
  const serviceId=payload?.data?.servicio_id;
  const offerId=payload?.data?.oferta_id;
  const serviceSuffix=serviceId?`&serviceId=${encodeURIComponent(serviceId)}`:'';
  const offerSuffix=payload.type==='nueva_oferta'&&typeof offerId==='string'&&offerId?`&offerId=${encodeURIComponent(offerId)}`:'';
  const providerHistoryTypes=new Set(['pago_efectivo_confirmado','servicio_completado','servicio_cancelado']);
  const providerHistorySuffix=providerHistoryTypes.has(payload.type)&&serviceId?`&historyServiceId=${encodeURIComponent(serviceId)}`:'';
  const providerScreenSuffix=payload.type==='pago_liberado'?'&providerScreen=earnings':'';
  const providerRoute=offerSuffix||providerHistorySuffix||providerScreenSuffix||serviceSuffix;
  const roleUrl=role==='provider'?new URL(`?app=provider${providerRoute}`,appBase).href:role==='client'?new URL(`?app=client${serviceSuffix}`,appBase).href:(payload.url?new URL(payload.url,appBase).href:appBase.href);
  const serviceLifecycleTypes=new Set(['proveedor_asignado','trabajo_asignado','proveedor_en_camino','proveedor_llego','servicio_iniciado','aprobacion_pendiente','servicio_completado','trabajo_aprobado','servicio_cancelado','servicio_disputado']);
  const lifecycleTag=serviceId&&serviceLifecycleTypes.has(payload.type)?`ugo-service-${serviceId}`:null;
  const options={
    body:payload.body||'Tenés una actualización en U.GO.',
    icon:new URL('favicon.svg',appBase).href,
    badge:new URL('favicon.svg',appBase).href,
    tag:lifecycleTag||payload.notificationId||payload.type||'ugo',
    renotify:true,
    vibrate:[160,70,220],
    data:{...(payload.data||{}),url:roleUrl}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/',self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if('focus'in client){
        try{await client.navigate(target)}catch{}
        return client.focus();
      }
    }
    return self.clients.openWindow?self.clients.openWindow(target):undefined;
  })());
});
