import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Subscription={endpoint:string;p256dh:string;auth:string;activa:boolean};
type Delivery={id:string;suscripcion_id:string;suscripcion:Subscription|Subscription[]|null};
type Config={vapid_public:string;vapid_private:string;dispatch_token:string;edge_url:string;vapid_subject:string};

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return new Response("method not allowed",{status:405});
  try{
    const url=Deno.env.get("SUPABASE_URL")||"";
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    if(!url||!serviceKey)return Response.json({error:"backend not configured"},{status:503});
    const sb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const{data:cfgRows,error:cfgError}=await sb.rpc("push_backend_config");
    if(cfgError)throw cfgError;
    const cfg=(Array.isArray(cfgRows)?cfgRows[0]:cfgRows) as Config|undefined;
    if(!cfg?.dispatch_token||req.headers.get("x-ugo-push-token")!==cfg.dispatch_token)return Response.json({error:"unauthorized"},{status:401});
    const body=await req.json().catch(()=>({}));
    const notificationId=String(body?.notification_id||"");
    if(!/^[0-9a-f-]{36}$/i.test(notificationId))return Response.json({error:"invalid notification"},{status:400});

    const{data:notice,error:noticeError}=await sb.from("notificaciones").select("id,usuario_id,tipo,titulo,cuerpo,datos").eq("id",notificationId).maybeSingle();
    if(noticeError)throw noticeError;
    if(!notice)return Response.json({ok:true,sent:0,reason:"notification missing"});

    const{data:rows,error:deliveryError}=await sb.from("push_entregas").select("id,suscripcion_id,suscripcion:push_suscripciones(endpoint,p256dh,auth,activa)").eq("notificacion_id",notificationId).eq("estado","pendiente");
    if(deliveryError)throw deliveryError;
    const deliveries=(rows||[]) as Delivery[];
    if(!deliveries.length)return Response.json({ok:true,sent:0});

    webpush.setVapidDetails(cfg.vapid_subject||"mailto:admin@ugo.app",cfg.vapid_public,cfg.vapid_private);
    let sent=0,failed=0;
    for(const delivery of deliveries){
      const relation=Array.isArray(delivery.suscripcion)?delivery.suscripcion[0]:delivery.suscripcion;
      if(!relation?.activa){
        await sb.from("push_entregas").update({estado:"omitido",ultimo_error:"Suscripción inactiva"}).eq("id",delivery.id);
        continue;
      }
      try{
        const payload=JSON.stringify({title:notice.titulo,body:notice.cuerpo||"Tenés una actualización en UGO.",notificationId:notice.id,type:notice.tipo,data:notice.datos||{}});
        await webpush.sendNotification({endpoint:relation.endpoint,keys:{p256dh:relation.p256dh,auth:relation.auth}},payload,{TTL:300,urgency:notice.tipo==="nueva_oferta"?"high":"normal"});
        await sb.from("push_entregas").update({estado:"enviado",ultimo_error:null}).eq("id",delivery.id);
        sent++;
      }catch(error:any){
        const status=Number(error?.statusCode||error?.status||0);
        const message=String(error?.body||error?.message||"push failed").slice(0,500);
        await sb.from("push_entregas").update({estado:"error",ultimo_error:message}).eq("id",delivery.id);
        if(status===404||status===410)await sb.from("push_suscripciones").update({activa:false,updated_at:new Date().toISOString()}).eq("id",delivery.suscripcion_id);
        failed++;
      }
    }
    return Response.json({ok:true,sent,failed});
  }catch(error:any){
    console.error("push-dispatch",error);
    return Response.json({error:String(error?.message||error||"push error")},{status:500});
  }
});
