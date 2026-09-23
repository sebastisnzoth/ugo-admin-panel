export type HugoLocale='es-AR'|'pt-BR'
export type HugoWhen='ahora'|'hoy'|'programar'
export type HugoWhenResult={when:HugoWhen;scheduleAt:string;whenLabel:string;urgent:boolean}
export type HugoGlobalCommand='home'|'activity'|'cancel'|null
export type HugoProviderCandidate={id:string;nombre?:string|null}

export function normalizeHugoText(value:string){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s:.,/-]/gu,' ').replace(/\s+/g,' ').trim()}

export function isHugoAffirmative(text:string){
 const value=normalizeHugoText(text)
 if(/\b(no|nao)\b/.test(value))return false
 return /^(si|sim|dale|confirmo|confirmar|confirma|confirmalo|hacelo|faca|pode fazer|adelante|ok|okay|de acuerdo|de acordo|correcto|correto|vamos|esta bien)\b/.test(value)||/\b(confirmar|confirmo|confirma|confirmalo|confirmar pedido|confirmar el pedido|pode confirmar|confirma o pedido)\b/.test(value)
}

export function isHugoNegative(text:string){return /^(no|nao|no gracias|nao obrigado|dejalo|deja|deixe|mejor no|melhor nao)\b/.test(normalizeHugoText(text))}
export function isHugoRetry(text:string){return /\b(reintenta|reintentar|intenta de nuevo|proba de nuevo|probar de nuevo|tenta de novo|tentar de novo|continuar busqueda|seguir buscando)\b/.test(normalizeHugoText(text))}

export function resolveHugoGlobalCommand(text:string):HugoGlobalCommand{
 const value=normalizeHugoText(text)
 if(value==='inicio'||value==='home'||/\bpantalla de inicio\b/.test(value)||/\b(volver|volve|volveme|volverme|ir|anda|andame|lleva|llevame)\b.*\b(inicio|home)\b/.test(value))return'home'
 if(/\b(ver|mostrar|mostrame|abrir|ir a)\b.*\b(actividad|historial)\b/.test(value)||value==='actividad'||value==='historial')return'activity'
 if(/\b(cancelar|cancela|cancelame|anular|anula)\b.*\b(pedido|servicio|solicitud)\b/.test(value))return'cancel'
 return null
}

function pad(value:number){return String(value).padStart(2,'0')}
function localDateTime(date:Date){return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`}

export function parseHugoWhen(text:string,now=new Date()):HugoWhenResult|null{
 const value=normalizeHugoText(text)
 if(/\b(ahora|ya mismo|agora)\b/.test(value))return{when:'ahora',scheduleAt:'',whenLabel:'Ahora',urgent:true}
 if(/\b(hoy|hoje)\b/.test(value)&&!/\b(manana|amanha)\b/.test(value))return{when:'hoy',scheduleAt:'',whenLabel:'Hoy',urgent:false}
 if(!/\b(manana|amanha)\b/.test(value))return null
 const date=new Date(now)
 date.setDate(date.getDate()+1)
 let hour=/\b(tarde)\b/.test(value)?15:/\b(noche|noite)\b/.test(value)?19:10
 let minute=0
 const clock=value.match(/\b(?:a\s+las?|as|às)?\s*(\d{1,2})(?::(\d{2}))?\s*(?:h|hs|horas?)?\b/)
 if(clock){
  hour=Math.min(23,Math.max(0,Number(clock[1])))
  minute=Math.min(59,Math.max(0,Number(clock[2]||0)))
  if(/\b(tarde|noche|noite)\b/.test(value)&&hour>0&&hour<12)hour+=12
 }
 date.setHours(hour,minute,0,0)
 return{when:'programar',scheduleAt:localDateTime(date),whenLabel:`Mañana ${pad(hour)}:${pad(minute)}`,urgent:false}
}

function compact(value:string){return normalizeHugoText(value).replace(/[^a-z0-9]/g,'')}
function editDistance(a:string,b:string){const rows=Array.from({length:b.length+1},(_,index)=>index);for(let i=1;i<=a.length;i++){let previous=rows[0];rows[0]=i;for(let j=1;j<=b.length;j++){const hold=rows[j],cost=a[i-1]===b[j-1]?0:1;rows[j]=Math.min(rows[j]+1,rows[j-1]+1,previous+cost);previous=hold}}return rows[b.length]}
function similarity(a:string,b:string){if(!a||!b)return 0;if(a===b)return 1;return 1-editDistance(a,b)/Math.max(a.length,b.length)}
function choiceFragment(text:string){let value=normalizeHugoText(text);const marker=value.match(/\b(elijo|elegi|elegir|quiero a|contrata|contratar|escolho|escolhi|quero o|quero a|contrate)\b/);if(marker?.index!=null)value=value.slice(marker.index+marker[0].length);value=value.replace(/^(a|al|el|la|o)\s+/,'');return value.split(/\b(por ejemplo|porque|que ya|ya me|confirmar|confirmo|confirma|confirma|confirmalo|si|sim|dale|por favor)\b/)[0].replace(/\b(y|e)\s*$/,'').trim()}

export function chooseHugoProvider<T extends HugoProviderCandidate>(text:string,providers:T[]):T|null{
 const normalized=normalizeHugoText(text),choose=/\b(elijo|elegi|elegir|quiero a|contrata|contratar|escolho|escolhi|quero o|quero a|contrate)\b/.test(normalized)
 const exact=providers.find(provider=>{const full=normalizeHugoText(provider.nombre||''),first=full.split(' ')[0]||'';return Boolean(full)&&(normalized===full||normalized.includes(full)||(first.length>=4&&normalized===first))})
 if(exact)return exact
 if(!choose)return null
 const target=compact(choiceFragment(text));if(!target)return null
 let best:T|null=null,bestScore=0,secondScore=0
 for(const provider of providers){
  const full=normalizeHugoText(provider.nombre||''),fullCompact=compact(full);if(!fullCompact)continue
  let score=similarity(target,fullCompact)
  for(const token of full.split(/\s+/)){const clean=compact(token);if(clean.length>=4&&target.includes(clean))score=Math.max(score,.92)}
  const withoutOfficial=fullCompact.replace(/oficial$/,'')
  if(withoutOfficial!==fullCompact)score=Math.max(score,similarity(target.replace(/oficial$/,''),withoutOfficial))
  if(score>bestScore){secondScore=bestScore;bestScore=score;best=provider}else if(score>secondScore)secondScore=score
 }
 if(bestScore<.7)return null
 if(secondScore>=.7&&bestScore-secondScore<.08)return null
 return best
}
