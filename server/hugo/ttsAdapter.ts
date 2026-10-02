import{clean,sanitizeForModel}from'./security'

type JsonRecord=Record<string,unknown>
const asRecord=(value:unknown):JsonRecord=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{}
const nested=(value:unknown,...keys:string[]):unknown=>keys.reduce<unknown>((item,key)=>Array.isArray(item)?item[Number(key)]:asRecord(item)[key],value)
const parts=(value:unknown):JsonRecord[]=>Array.isArray(value)?value.map(asRecord):[]

const TTS_MODELS=Array.from(new Set([
 process.env.GEMINI_TTS_FAST_MODEL,
 process.env.GEMINI_TTS_MODEL,
 'gemini-3.1-flash-tts-preview',
 'gemini-2.5-flash-preview-tts',
].filter(Boolean)as string[]))
const TTS_VOICE=process.env.GEMINI_TTS_VOICE||'Puck'

function geminiKey(){
 const key=process.env.GEMINI_API_KEY?.trim()
 if(!key)throw Object.assign(new Error('GEMINI_API_KEY no configurada'),{status:503})
 return key
}

function sampleRateFromMime(mime:string){
 const match=String(mime||'').match(/rate=(\d+)/i),value=Number(match?.[1]||24000)
 return Number.isFinite(value)&&value>0?value:24000
}

export async function askHugoTts(text:string,locale:string){
 const key=geminiKey(),languageCode=locale==='pt-BR'?'pt-BR':'es-ES',safeText=sanitizeForModel(text,360)
 const prompt=locale==='pt-BR'?'Fale como Hugo: simpático, próximo, acolhedor e ágil, como um amigo confiável ajudando a resolver algo. Não acrescente nem retire informação. Diga apenas: '+safeText:'Hablá como Hugo: simpático, cercano, cálido y ágil, como un amigo confiable que ayuda a resolver algo. No agregues ni quites informação. Decí solamente: '+safeText
 let lastStatus=502,lastError='Gemini TTS no respondió',lastRetryAfter=''
 for(const model of TTS_MODELS){
  const started=Date.now()
  try{
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-goog-api-key':key},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{languageCode,voiceConfig:{prebuiltVoiceConfig:{voiceName:TTS_VOICE}}}}}),
    signal:AbortSignal.timeout(6500)
   })
   const payload:unknown=await response.json().catch(()=>({})),elapsed=Date.now()-started
   console.info('Hugo TTS timing',{model,ms:elapsed,status:response.status})
   if(response.ok){
    const part=parts(nested(payload,'candidates','0','content','parts')).find(item=>nested(item,'inlineData','data'))
    const audioBase64=clean(nested(part,'inlineData','data'),4_500_000)
    const mimeType=clean(nested(part,'inlineData','mimeType')||'audio/L16;codec=pcm;rate=24000',120)
    if(audioBase64)return{audio_base64:audioBase64,mime_type:mimeType,sample_rate:sampleRateFromMime(mimeType),model,voice:TTS_VOICE}
    lastError='Gemini TTS no devolvió audio';lastStatus=502;continue
   }
   lastStatus=response.status
   lastError=clean(nested(payload,'error','message'))||'Gemini TTS '+response.status
   lastRetryAfter=String(response.headers.get('retry-after')||'')
   if(response.status===429)break
   const retryable=[404,500,502,503].includes(response.status)||/overloaded|temporar|not found|unavailable/i.test(String(lastError))
   if(!retryable)break
  }catch(error:unknown){
   const elapsed=Date.now()-started
   console.warn('Hugo TTS timing',{model,ms:elapsed,status:'transport',message:error instanceof Error?error.message:String(error)})
   lastError=error instanceof Error?error.message:'Gemini TTS no disponible'
   lastStatus=504
  }
 }
 throw Object.assign(new Error(lastError),{status:lastStatus,retryAfter:lastRetryAfter})
}