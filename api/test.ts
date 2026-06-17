import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method==='OPTIONS') return res.status(200).end();
  const{data}=await sb.from('config_sistema').select('valor').eq('clave','api_gemini_key').single();
  const key=data?.valor?.trim();
  let geminiOk=false, geminiError='', workingModel='';
  // Only test models that work with AQ. key format
  for(const model of ['gemini-flash-latest','gemini-2.0-flash','gemini-1.5-flash']){
    try{
      const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
         body:JSON.stringify({contents:[{role:'user',parts:[{text:'Di "ok"'}]}],generationConfig:{maxOutputTokens:5}})});
      const d=await r.json();
      if(d.candidates?.[0]?.content?.parts?.[0]?.text){geminiOk=true;workingModel=model;break;}
      geminiError=d.error?.message||'no candidates';
    }catch(e:any){geminiError=e.message;}
  }
  return res.json({supabase_ok:!!key,key_prefix:key?.slice(0,10)+'...',gemini_ok:geminiOk,working_model:workingModel,gemini_error:geminiError});
}
