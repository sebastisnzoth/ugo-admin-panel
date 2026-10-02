import{askHugoModel}from'./modelRouter'
import{sanitizeForModel}from'./security'

type JsonRecord=Record<string,unknown>
const asRecord=(value:unknown):JsonRecord=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{}
const MODEL=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'

export async function askHugoText(message:string,history:unknown[],system:string,jsonMode=false){
 const safeSystem=sanitizeForModel(system,12000)
 const safeHistory=history.slice(-8).map(item=>{const m=asRecord(item);return{role:m.role==='assistant'?'assistant':'user',content:sanitizeForModel(m.content,1200)}})
 const safeMessage=sanitizeForModel(message,1800)
 return askHugoModel(safeMessage,safeHistory,safeSystem,jsonMode,MODEL)
}