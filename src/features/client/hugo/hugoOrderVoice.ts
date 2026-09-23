import type{Category}from'../../../mvp/shared'

export type HugoUrgency='now'|'today'|'scheduled'
export type HugoDraft={categoryId:string;categoryName:string;categorySlug:string;description:string;address:string;urgency:HugoUrgency|null;scheduleAt:string;whenLabel:string}
export const EMPTY_HUGO_DRAFT:HugoDraft={categoryId:'',categoryName:'',categorySlug:'',description:'',address:'',urgency:null,scheduleAt:'',whenLabel:''}

export function normalizeHugo(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s:.,/-]/gu,' ').replace(/\s+/g,' ').trim()}
export function isHugoAffirmative(text:string){return /^(si|sí|sim|dale|confirmo|confirmar|confirma|perfecto|perfeito|hacelo|mandalo|manda|ok|okay|okey|esta bien|está bien|vamos|de acuerdo|de acordo)$/i.test(text.trim())}
export function isHugoCancel(text:string){const m=normalizeHugo(text);return /^(cancelar|cancela|cancelalo|cancelar pedido|cancelar servicio|cancelar servico|cancela el pedido|cancele o pedido|no|nao|dejalo|deja|deixe|olvidate|esquece|volver)$/.test(m)||/\b(cancelar pedido|cancelar servicio|cancelar servico)\b/.test(m)}
export function isHugoEdit(text:string){return /\b(editar pedido|editar|cambiarlo|quiero cambiar|cambiar pedido|mudar pedido|quero mudar|alterar pedido)\b/.test(normalizeHugo(text))}
export function wantsHugoLocation(text:string){return /\b(mi ubicacion actual|mi direccion actual|donde estoy|usar mi ubicacion|usa mi ubicacion|minha localizacao atual|meu endereco atual|onde estou|usar minha localizacao)\b/.test(normalizeHugo(text))}

const aliases:Record<string,string[]>={
 jardineria:['jardinero','jardineria','jardin','jardineiro','jardinagem'],
 electricidad:['electricista','electricidad','electrico','enchufe','disyuntor','luz','eletricista','eletrica'],
 plomeria:['plomero','plomeria','fontanero','caño','canilla','perdida de agua','pileta','encanador','encanamento','vazamento'],
 limpieza:['limpieza','limpiar','limpiador','limpiadora','faxina','limpeza','diarista'],
 pintura:['pintor','pintura'],cerrajeria:['cerrajero','cerrajeria','chaveiro'],
 reparaciones:['reparacion','reparaciones','arreglos','armar mueble','instalar soporte','manutencao','reparo'],
 'aire acondicionado':['aire acondicionado','climatizacion','split','ar condicionado','climatizacao']
}
export function hugoCategory(categories:Category[],text:string){const q=normalizeHugo(text);return categories.find(c=>{const n=normalizeHugo(c.nombre),s=normalizeHugo(c.slug);if(q.includes(n)||q.includes(s))return true;return Object.entries(aliases).some(([key,words])=>(n.includes(key)||s.includes(key))&&words.some(w=>q.includes(normalizeHugo(w))))})||null}

const words:Record<string,number>={una:1,uno:1,um:1,dos:2,dois:2,duas:2,tres:3,cuatro:4,quatro:4,cinco:5,seis:6,siete:7,sete:7,ocho:8,oito:8,nueve:9,nove:9,diez:10,dez:10,once:11,onze:11,doce:12,doze:12,trece:13,treze:13,catorce:14,quatorze:14,quince:15,quinze:15,dieciseis:16,dezesseis:16,diecisiete:17,dezessete:17,dieciocho:18,dezoito:18,diecinueve:19,dezenove:19,veinte:20,vinte:20}
function clock(text:string){const m=normalizeHugo(text),d=m.match(/(?:a las|a la|as|às)?\s*([01]?\d|2[0-3])(?::(\d{2}))?/);if(d)return{h:Number(d[1]),m:Number(d[2]||0)};for(const[w,h]of Object.entries(words))if(new RegExp(`\\b${w}\\b`).test(m))return{h,m:0};return null}
function local(date:Date){const p=(n:number)=>String(n).padStart(2,'0');return`${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`}
export function hugoTiming(text:string){const m=normalizeHugo(text),now=new Date(),c=clock(text);if(/\b(ahora|ya mismo|agora)\b/.test(m))return{urgency:'now' as const,scheduleAt:'',whenLabel:'Ahora'};if(/\b(manana|amanha)\b/.test(m)){const d=new Date(now);d.setDate(d.getDate()+1);d.setHours(c?.h??10,c?.m??0,0,0);return{urgency:'scheduled' as const,scheduleAt:local(d),whenLabel:`Mañana ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}}if(/\b(hoy|hoje)\b/.test(m)){if(c){const d=new Date(now);d.setHours(c.h,c.m,0,0);return{urgency:'scheduled' as const,scheduleAt:local(d),whenLabel:`Hoy ${String(c.h).padStart(2,'0')}:${String(c.m).padStart(2,'0')}`}}return{urgency:'today' as const,scheduleAt:'',whenLabel:'Hoy'}}return null}
export function hugoAddress(text:string){const raw=text.trim(),p=/\b(?:en|em)\s+(.+?)(?=\s+(?:porque|por que|pois|mañana|amanha|hoy|hoje|ahora|agora)\b|[,.]|$)/i,m=raw.match(p),v=m?.[1]?.trim();return v&&v.length>=3?v:''}
export function hugoDescription(text:string){const raw=text.trim(),r=raw.match(/\b(?:porque|por que|pois)\s+(.+)$/i)?.[1]?.trim();if(r&&r.length>=5)return r;const n=raw.match(/\b(?:necesito que|preciso que|quiero que|quero que)\s+(.+)$/i)?.[1]?.trim();if(n&&n.length>=5)return n;return raw.length>=12?raw:''}
export function hugoMissing(d:HugoDraft){return[!d.categoryId?'category':'',d.description.trim().length<5?'description':'',!d.address.trim()?'location':'',!d.urgency?'when':''].filter(Boolean)}
export function hugoQuestion(d:HugoDraft){const m=hugoMissing(d);if(m.includes('category'))return'¿Qué tipo de profesional necesitás?';if(m.includes('description'))return'¿Qué pasó o qué trabajo necesitás hacer?';if(m.includes('location'))return'¿Dónde necesitás el servicio?';if(m.includes('when'))return'¿Lo necesitás ahora, hoy o para otro momento?';return''}
