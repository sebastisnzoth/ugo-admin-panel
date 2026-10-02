import{createClient}from'@supabase/supabase-js'
import{decideHugoAuthority,normalizeHugoRequestedRole}from'./authority'

type JsonRecord=Record<string,unknown>
type RequestLike={headers?:Record<string,string|undefined>}
const SUPABASE_URL=process.env.SUPABASE_URL
const SUPABASE_ANON_KEY=process.env.SUPABASE_ANON_KEY

function bearer(req:RequestLike){
 const raw=String(req.headers?.authorization||'')
 return raw.startsWith('Bearer ')?raw.slice(7).trim():''
}

export async function authorizeHugo(req:RequestLike,body:JsonRecord){
 const token=bearer(req)
 if(!token)throw Object.assign(new Error('Autenticación requerida para usar Hugo.'),{status:401,code:'AUTH_REQUIRED'})
 if(!SUPABASE_URL||!SUPABASE_ANON_KEY)throw Object.assign(new Error('Backend Supabase TEST no configurado.'),{status:503,code:'AUTH_BACKEND_UNAVAILABLE'})
 const authClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
 const{data,error}=await authClient.auth.getUser(token)
 if(error||!data.user)throw Object.assign(new Error('Sesión inválida o vencida.'),{status:401,code:'INVALID_SESSION'})
 const userClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
 const{data:profile,error:profileError}=await userClient.from('usuarios').select('tipo,activo').eq('id',data.user.id).maybeSingle()
 if(profileError)throw Object.assign(new Error('No se pudo verificar la autoridad de la sesión.'),{status:403,code:'PROFILE_LOOKUP_FAILED'})
 const requestedRole=normalizeHugoRequestedRole(body.role)
 const decision=decideHugoAuthority(requestedRole,String(profile?.tipo||''),Boolean(profile?.activo))
 if(!decision.allowed)throw Object.assign(new Error(decision.reason),{status:403,code:decision.code,authority:decision})
 return{user:data.user,profile,requestedRole,decision}
}
