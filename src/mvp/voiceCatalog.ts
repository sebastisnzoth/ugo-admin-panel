import{getRoleSupabase}from'../lib/roleSupabase'
import{providerRadarForCategory,refreshProviderRadar}from'./client/providerRadarStore'

export type VoiceCategory={id:string;slug:string|null;nombre:string|null}
export type VoiceProvider={id:string;nombre:string|null;karma:number|string|null;servicios_completados:number|null;tarifa_base:number|string|null;experiencia_anos:number|null}
export type VoiceAvailability={category:VoiceCategory;providers:VoiceProvider[]}

const commonAliases:Array<[RegExp,string[]]>=[
 [/\b(electricista|electricidad|eletricista|eletrica|enchufe|tomacorriente)\b/,['electricidad','eletrica']],
 [/\b(plomero|plomeria|fontanero|encanador|encanamento|canilla|grifo)\b/,['plomeria','encanamento','hidraulica']],
 [/\b(jardinero|jardineria|jardineiro|jardinagem|pasto|cesped)\b/,['jardineria','jardinagem']],
 [/\b(limpieza|limpiador|faxina|limpeza|diarista)\b/,['limpieza','limpeza','faxina']],
 [/\b(pintor|pintura)\b/,['pintura']],
 [/\b(cerrajero|cerrajeria|chaveiro)\b/,['cerrajeria','chaveiro']],
 [/\b(carpintero|carpinteria|marceneiro|marcenaria)\b/,['carpinteria','marcenaria']],
 [/\b(mueble|muebles|puerta de cocina|puertas de cocina|bisagra|bisagras|movel|moveis|dobradica|dobradicas)\b/,['reparaciones','reparacao','manutencao','carpinteria','marcenaria']],
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
 await refreshProviderRadar(sb,true)
 const providers=providerRadarForCategory(category.id,{onlyAvailable:true})
  .sort((a,b)=>Number(b.karma||0)-Number(a.karma||0)||Number(b.servicios_completados||0)-Number(a.servicios_completados||0)||Number(b.experiencia_anos||0)-Number(a.experiencia_anos||0))
  .map(provider=>({id:provider.id,nombre:provider.nombre,karma:provider.karma,servicios_completados:provider.servicios_completados,tarifa_base:provider.tarifa_base,experiencia_anos:provider.experiencia_anos??null}))
 return{category,providers}
}

function providerFacts(provider:VoiceProvider,pt:boolean){
 const bits:string[]=[]
 const karma=Number(provider.karma||0),jobs=Number(provider.servicios_completados||0),exp=Number(provider.experiencia_anos||0),rate=Number(provider.tarifa_base||0)
 if(karma>0)bits.push(`karma ${karma.toFixed(1)}`)
 if(jobs>0)bits.push(pt?`${jobs} trabalho${jobs===1?'':'s'} concluído${jobs===1?'':'s'}`:`${jobs} trabajo${jobs===1?'':'s'} completado${jobs===1?'':'s'}`)
 if(exp>0)bits.push(pt?`${exp} anos de experiência`:`${exp} años de experiencia`)
 if(rate>0)bits.push(`R$ ${rate.toFixed(0)}/h`)
 return bits.join(', ')
}

export function voiceAvailabilityText(result:VoiceAvailability,locale:'es-AR'|'pt-BR'){
 const pt=locale==='pt-BR',name=result.category.nombre||result.category.slug||'esta categoría',total=result.providers.length
 if(!total)return pt?`Agora não vejo profissionais de ${name} online.`:`Ahora no veo profesionales de ${name} online.`
 const best=result.providers[0],bestName=best?.nombre||'',bestFacts=best?providerFacts(best,pt):'',hasSignals=Boolean(bestFacts)
 const others=result.providers.slice(1,3).map(provider=>provider.nombre).filter(Boolean)as string[]
 const otherText=others.length?pt?` Também estão online ${others.join(' e ')}.`:` También están online ${others.join(' y ')}.`:''
 if(total===1)return pt?`Encontrei 1 profissional de ${name} online. Minha recomendação é ${bestName}${bestFacts?`, com ${bestFacts}`:''}.`:`Encontré 1 profesional de ${name} online. Mi recomendación es ${bestName}${bestFacts?`, con ${bestFacts}`:''}.`
 return pt?`Vejo ${total} profissionais de ${name} online. ${hasSignals?'Pelos dados reais da UGO,':'Como primeira opção disponível,'} eu começaria por ${bestName}${bestFacts?`, com ${bestFacts}`:''}.${otherText}`:`Veo ${total} profesionales de ${name} online. ${hasSignals?'Por los datos reales de UGO,':'Como primera opción disponible,'} empezaría por ${bestName}${bestFacts?`, con ${bestFacts}`:''}.${otherText}`
}
