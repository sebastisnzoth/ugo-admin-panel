self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch{payload={body:event.data?.text()||''}}
  const title=payload.title||'U.GO';
  const role=payload?.data?.role;
  const roleUrl=role==='provider'?'/?app=provider':role==='client'?'/?app=client':(payload.url||'/');
  const options={
    body:payload.body||'Tenés una actualización en U.GO.',
    icon:'/favicon.svg',
    badge:'/favicon.svg',
    tag:payload.notificationId||payload.type||'ugo',
    renotify:true,
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
