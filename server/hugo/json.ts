export type JsonRecord=Record<string,unknown>

export function asRecord(value:unknown):JsonRecord{
 return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{}
}

export function extractJson(value:unknown):JsonRecord{
 const text=String(value||'').trim()
 if(!text)return{}
 try{return asRecord(JSON.parse(text))}
 catch{
  const start=text.indexOf('{'),end=text.lastIndexOf('}')
  if(start<0||end<=start)return{}
  try{return asRecord(JSON.parse(text.slice(start,end+1)))}catch{return{}}
 }
}
