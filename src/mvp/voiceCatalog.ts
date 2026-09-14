import{getRoleSupabase}from'../lib/roleSupabase'
import{providerRadarForCategory,refreshProviderRadar}from'./client/providerRadarStore'

export type VoiceCategory={id:string;slug:string|null;nombre:string|null}
export type VoiceProvider={id:string;nombre:string|null;karma:number|string|null}
export type VoiceAvailability={category:VoiceCategory;providers:VoiceProvider[]}

const commonAliases:Array<[RegExp,string[]]>=[
 [/\b(electricista|electricidad|eletricista|eletrica|enchufe|tomacorriente)\b/,['electricidad','eletrica']],
 [/\b(plomero|plomeria|fontanero|encanador|encanamento|canilla|grifo)\b/,['plomeria','encanamento','hidraulica']],
 [/\b(jardinero|jardineria|jardineiro|jardinagem|pasto|cesped)\b/,['jardineria','jardinagem']],
 [/\b(limpieza|limpiador|faxina|limpeza|diarista)\b/,['limpieza','limpeza','faxina']],
 [/\b(pintor|pintura)\b/,['pintura']],
 [/\b(cerrajero|cerrajeria|chaveiro)\b/,['cerrajeria','chaveiro']],
 [/\b(carpintero|carpinteria|marceneiro|marcenaria)\b/,['carpinteria','marcenaria']],
 [/\b(aire acondicionado|ar condicionado|climatizacion|climatizacao)\b/,['aire acondicionado','ar condicionado','climatizacion']],
 [/\b(mudanza|mudanzas|frete|flete)\b/,['mudanza','frete']],
 [/\b(reparacion|reparaciones|reparar|arreglar|conserto|manutencao)\b/,['reparaciones','reparacao','manutencao']],
]
const stop=new Set('necesito quiero preciso quero pedir contratar busco busca buscar buscame mostrame encontre encontra un una um uma de del para por con que servicio servico profesional profissional ahora agora hoy hoje urgente'.split(' '))

export function normalizeVoiceText(value:string){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s:.,/-]/gu,' ').replace(/\s+/g,' ').trim()}
function words(value:string){return normalizeVoiceText(value).split(/\s+/).map(x=>x.replace(/[^\p{L}\p{N}]/gu,'')).filter(x=>x.length>=3&&!stop.has(x))}
function categoryText(category:VoiceCategory){return normalizeVoiceText(`${category.nombre||''} ${category.slug||''}`)}

export async function resolveVoiceCategory(text:string):Promise<VoiceCategory|null>{
 const sb=getRoleSupabase('client'),{data,error}=await sb.from('categorias').select('id,slug,nombre').eq('activa',true).order('nombre')
 if(error)throw error
 const categories=(data||[])as VoiceCategory[],normalized=normalizeVoiceText(text)
 const direct=categories.find(category=>{const name=normalizeVoiceText(category.nombre||''),slug=normalizeVoiceText(category.slug||'');return(Boolean(name)&&normalized.includes(name))||(Boolean(slug)&&normalized.includes(slug))})
 if(direct)return direct
 const alias=commonAliases.find(([pattern])=>pattern.test(normalized))
 if(alias){const match=categories.find(category=>alias[1].some(target=>categoryText(category).includes(normalizeVoiceText(target))));if(match)return match}
 const input=words(normalized);let best:VoiceCategory|null=null,bestScore=0
 for(const category of categories){const candidates=words(categoryText(category));if(!candidates.length)continue;const overlap=candidates.filter(word=>input.some(token=>token===word||token.startsWith(word)||word.startsWith(token))).length/candidates.length;if(overlap>bestScore){best=category;bestScore=overlap}}
 return bestScore>=0.6?best:null
}

export async function loadVoiceAvailability(category:VoiceCategory):Promise<VoiceAvailability>{
 const sb=getRoleSupabase('client')
 // Voice must answer from the live backend, never from the 15s radar cache. The
 // refreshed rows are also published to the shared radar store, so cards and
 // Hugo's spoken answer stay on the same source of truth.
 await refreshProviderRadar(sb,true)
 const providers=providerRadarForCategory(category.id,{onlyAvailable:true})
  .sort((a,b)=>Number(b.karma||0)-Number(a.karma||0))
  .map(provider=>({id:provider.id,nombre:provider.nombre,karma:provider.karma}))
 return{category,providers}
}

export function voiceAvailabilityText(result:VoiceAvailability,locale:'es-AR'|'pt-BR'){
 const pt=locale==='pt-BR',name=result.category.nombre||result.category.slug||'esta categoría',total=result.providers.length
 if(!total)return pt?`Agora não vejo profissionais de ${name} online.`:`Ahora no veo profesionales de ${name} online.`
 const names=result.providers.map(provider=>provider.nombre).filter(Boolean).slice(0,3)as string[],joined=names.length>1?`${names.slice(0,-1).join(', ')}${pt?' e ':' y '}${names.at(-1)}`:names[0]||'',more=total>names.length?(pt?` e mais ${total-names.length}`:` y ${total-names.length} más`):''
 return pt?`Sim. Vejo ${total} ${total===1?'profissional':'profissionais'} de ${name} online${joined?`: ${joined}${more}`:''}. Estou mostrando na tela.`:`Sí. Veo ${total} ${total===1?'profesional':'profesionales'} de ${name} online${joined?`: ${joined}${more}`:''}. Te los muestro en pantalla.`
}
