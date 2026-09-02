import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import{parseClientIntent}from'./hugoIntent'
import{getDispatchProvider}from'../lib/dispatch/provider'
import type{Category}from'./shared'

type Draft={categoryId:string;categoryName:string;categorySlug:string;description:string;urgent:boolean;address:string;amount:number}
type Step=0|1|2|3|4
function norm(v:string){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function byHint(categories:Category[],hint:string){const q=norm(hint);return categories.find(c=>[c.nombre,c.slug].some(x=>{const n=norm(String(x||''));return n.includes(q)||q.includes(n)}))||null}

const shellStyle:React.CSSProperties={position:'fixed',left:'50%',bottom:132,transform:'translateX(-50%)',zIndex:82,width:'min(410px,calc(100vw - 24px))',background:'rgba(255,255,255,.98)',backdropFilter:'blur(18px)',borderRadius:24,padding:16,boxShadow:'0 22px 60px rgba(0,0,0,.24)'}
const primary:React.CSSProperties={width:'100%',padding:'14px 16px',border:0,borderRadius:15,fontWeight:950,fontSize:15,cursor:'pointer'}
const secondary:React.CSSProperties={width:'100%',padding:'10px',border:0,background:'transparent',fontWeight:850,fontSize:12,cursor:'pointer'}

export function ClientQuickOrder(){
 const[categories,setCategories]=useState<Category[]>([]),[draft,setDraft]=useState<Draft|null>(null),[step,setStep]=useState<Step>(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[description,setDescription]=useState(''),[selectedCategoryId,setSelectedCategoryId]=useState(''),[savedAddress,setSavedAddress]=useState('')
 const loadBase=useCallback(async()=>{const[{data:cats},{data:user}]=await Promise.all([supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre'),supabase.auth.getUser()]);setCategories((cats||[])as Category[]);if(user.user){const{data:p}=await supabase.from('perfiles_cliente').select('direccion,barrio,ciudad').eq('usuario_id',user.user.id).maybeSingle();const address=[(p as any)?.direccion,(p as any)?.barrio,(p as any)?.ciudad].filter(Boolean).join(', ');setSavedAddress(address)}return user.user||null},[])
 useEffect(()=>{loadBase().catch(()=>{})},[loadBase])

 const selectedCategory=useMemo(()=>categories.find(c=>c.id===selectedCategoryId)||null,[categories,selectedCategoryId])
 const topCategories=useMemo(()=>categories.slice(0,6),[categories])

 const estimate=useCallback(async(category:Category)=>{const{data:providers}=await supabase.from('proveedores_mapa').select('tarifa_base').eq('categoria_principal_id',category.id).eq('online',true).eq('disponible',true).limit(8);const prices=(providers||[]).map((p:any)=>Number(p.tarifa_base)).filter((n:number)=>Number.isFinite(n)&&n>0).sort((a:number,b:number)=>a-b);return prices.length?prices[Math.floor(prices.length/2)]:120},[])

 async function buildDraft(category:Category,text:string,urgent:boolean,address?:string){const amount=await estimate(category);setDraft({categoryId:category.id,categoryName:category.nombre,categorySlug:category.slug,description:text.trim(),urgent,address:address||savedAddress,amount})}

 useEffect(()=>{function local(event:Event){const text=String((event as CustomEvent<{text?:string}>).detail?.text||'').trim();if(!text||!categories.length)return;const intent=parseClientIntent(text,categories);const category=categories.find(c=>c.id===intent.categoryId);if(!category)return;setDescription(text);setSelectedCategoryId(category.id);buildDraft(category,text,intent.urgency).then(()=>setStep(savedAddress?3:2)).catch(()=>{})}function ai(event:Event){const d=(event as CustomEvent<{text?:string;categoryHint?:string|null;urgent?:boolean;description?:string|null}>).detail||{};if(!d.categoryHint||!categories.length)return;const category=byHint(categories,String(d.categoryHint));if(!category)return;const text=String(d.description||d.text||'').trim();setDescription(text);setSelectedCategoryId(category.id);buildDraft(category,text,Boolean(d.urgent)).then(()=>setStep(savedAddress?3:2)).catch(()=>{})}window.addEventListener('ugo:hugo-user-text',local as EventListener);window.addEventListener('ugo:hugo-ai-intent',ai as EventListener);return()=>{window.removeEventListener('ugo:hugo-user-text',local as EventListener);window.removeEventListener('ugo:hugo-ai-intent',ai as EventListener)}},[categories,savedAddress,buildDraft])

 function start(){setMessage('');setDraft(null);setDescription('');setSelectedCategoryId('');setStep(1)}
 function close(){setStep(0);setDraft(null);setMessage('')}

 async function nextFromNeed(){setMessage('');let category=selectedCategory;let text=description.trim();if(text.length<5){setMessage('Contame en una frase qué necesitás.');return}if(!category){const intent=parseClientIntent(text,categories);category=categories.find(c=>c.id===intent.categoryId)||null}if(!category){setMessage('Elegí el tipo de servicio para seguir.');return}setSelectedCategoryId(category.id);setBusy(true);try{await buildDraft(category,text,false);setStep(2)}finally{setBusy(false)}}

 function nextFromAddress(){if(!draft)return;const address=draft.address.trim();if(!address){setMessage('Necesito la dirección donde se hará el trabajo.');return}setDraft({...draft,address});setMessage('');setStep(3)}
 function chooseWhen(urgent:boolean){if(!draft)return;setDraft({...draft,urgent});setStep(4);setMessage('')}

 async function confirm(){if(!draft)return;setBusy(true);setMessage('');try{const{data:userData}=await supabase.auth.getUser();const user=userData?.user;if(!user)throw new Error('Sesión requerida.');const payload={cliente_id:user.id,categoria_id:draft.categoryId,estado:'buscando',descripcion:draft.description,direccion_cliente:draft.address,tarifa:draft.amount,urgencia:draft.urgent,metadata:{source:'magic-4-step',demo:false}};const{data,error}=await(supabase as any).from('servicios').insert(payload).select('id').single();if(error)throw error;if(!data?.id)throw new Error('No se pudo confirmar el pedido.');const result=await getDispatchProvider().start({serviceId:String(data.id),category:draft.categorySlug});const n=Array.isArray(result.raw)?result.raw.length:result.providerId?1:0;setDraft(null);setStep(0);setMessage(n?`✨ Listo. Hugo ya avisó a ${n} profesional${n===1?'':'es'}.`:'✨ Pedido creado. Hugo seguirá buscando por vos.')}catch(e){setMessage(e instanceof Error?e.message:'No se pudo crear el pedido.')}finally{setBusy(false)}}

 if(step===0&&!message)return <button type="button" onClick={start} style={{position:'fixed',left:'50%',bottom:148,transform:'translateX(-50%)',zIndex:80,border:0,borderRadius:999,padding:'13px 22px',fontWeight:950,fontSize:15,boxShadow:'0 12px 30px rgba(0,0,0,.22)',cursor:'pointer'}}>✨ Pedir un servicio</button>
 if(step===0&&message)return <div style={shellStyle}><div style={{fontWeight:900,fontSize:14}}>{message}</div><button type="button" onClick={()=>setMessage('')} style={secondary}>Cerrar</button></div>

 const progress=<div style={{display:'flex',gap:6,marginBottom:14}}>{[1,2,3,4].map(n=><span key={n} style={{height:5,flex:1,borderRadius:99,background:n<=step?'#111':'#e5e5e5'}}/>)}</div>
 const header=(title:string,subtitle:string)=><><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><small style={{fontWeight:900,opacity:.55}}>FÓRMULA MÁGICA UGO · {step}/4</small><h2 style={{fontSize:22,margin:'3px 0 2px'}}>{title}</h2><p style={{margin:0,fontSize:13,opacity:.7}}>{subtitle}</p></div><button type="button" onClick={close} style={{border:0,background:'transparent',fontSize:22,cursor:'pointer'}}>×</button></div>{progress}</>

 return <div style={shellStyle}>
  {step===1&&<>{header('¿Qué necesitás?','Una frase alcanza. Hugo se encarga del resto.')}<textarea autoFocus value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ej: Se me rompió una canilla y pierde agua" style={{width:'100%',minHeight:86,padding:12,borderRadius:14,border:'1px solid #ddd',fontSize:15,resize:'none'}}/><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginTop:9}}>{topCategories.map(c=><button type="button" key={c.id} onClick={()=>setSelectedCategoryId(c.id)} style={{padding:'9px 5px',border:selectedCategoryId===c.id?'2px solid #111':'1px solid #ddd',borderRadius:12,background:selectedCategoryId===c.id?'#f2f2f2':'#fff',fontWeight:800,fontSize:11,cursor:'pointer'}}>{c.emoji} {c.nombre}</button>)}</div>{message&&<p style={{fontSize:12,fontWeight:800,margin:'9px 0 0'}}>{message}</p>}<button type="button" onClick={nextFromNeed} disabled={busy} style={{...primary,marginTop:12}}>{busy?'Preparando…':'Siguiente'}</button></>}

  {step===2&&draft&&<>{header('¿Dónde?','Confirmá el lugar del servicio.')} {savedAddress&&draft.address===savedAddress&&<div style={{padding:'12px',borderRadius:14,background:'#f4f4f4',fontSize:13,marginBottom:9}}><b>📍 Tu dirección guardada</b><div style={{marginTop:4}}>{savedAddress}</div></div>}<input autoFocus={!savedAddress} value={draft.address} onChange={e=>setDraft({...draft,address:e.target.value})} placeholder="Calle, número y barrio" style={{width:'100%',padding:13,borderRadius:14,border:'1px solid #ddd',fontSize:14}}/>{message&&<p style={{fontSize:12,fontWeight:800,margin:'9px 0 0'}}>{message}</p>}<button type="button" onClick={nextFromAddress} style={{...primary,marginTop:12}}>Usar esta dirección</button><button type="button" onClick={()=>setStep(1)} style={secondary}>Atrás</button></>}

  {step===3&&draft&&<>{header('¿Para cuándo?','Elegí una opción. Nada más.')}<div style={{display:'grid',gap:9}}><button type="button" onClick={()=>chooseWhen(true)} style={{...primary,textAlign:'left'}}>⚡ Lo antes posible<small style={{display:'block',fontWeight:600,opacity:.6,marginTop:3}}>Es urgente</small></button><button type="button" onClick={()=>chooseWhen(false)} style={{...primary,textAlign:'left',background:'#f2f2f2'}}>🕒 Puede esperar<small style={{display:'block',fontWeight:600,opacity:.6,marginTop:3}}>Buscamos la mejor opción disponible</small></button></div><button type="button" onClick={()=>setStep(2)} style={secondary}>Atrás</button></>}

  {step===4&&draft&&<>{header('Confirmá y listo','Hugo empieza a buscar apenas confirmes.')}<div style={{display:'grid',gap:8,padding:'12px',borderRadius:15,background:'#f5f5f5',fontSize:13}}><span><b>{draft.categoryName}</b>{draft.urgent?' · ⚡ Urgente':''}</span><span>📝 {draft.description}</span><span>📍 {draft.address}</span><span>💰 Estimado: <b>R$ {draft.amount.toFixed(0)}</b></span></div><button type="button" onClick={confirm} disabled={busy} style={{...primary,marginTop:12,fontSize:16}}>{busy?'Buscando profesional…':'✨ Confirmar pedido'}</button><button type="button" onClick={()=>setStep(3)} style={secondary}>Atrás</button></>}
 </div>
}
