// Opt-in local-only HTTP transport for the existing Hive runner.
// Never binds LAN addresses and never gives the model tools or credentials.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { runLocalHiveAgent } from './hive-local-agent-runner.mjs';

const sameHost = new Set(['localhost', '127.0.0.1', '[::1]']);
export function createHiveLocalBridge({token, policy, run = runLocalHiveAgent} = {}) {
  if (typeof token !== 'string' || token.length < 32) throw new Error('HIVE_BRIDGE_TOKEN_REQUIRED');
  if (!policy) throw new Error('HIVE_POLICY_REQUIRED');
  let busy = false;
  return createServer(async (req,res)=>{
    const reject = (status,code)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:code}));};
    const host = req.headers.host?.split(':')[0];
    const origin = req.headers.origin;
    // Only local browsers; same-origin served UI can be proxied on localhost later.
    if (!sameHost.has(host) || (origin && !['http://localhost:5173','http://127.0.0.1:5173'].includes(origin)))
      return reject(403,'HIVE_LOCAL_ORIGIN_ONLY');
    if (req.headers['x-hive-local-token'] !== token) return reject(401,'HIVE_BRIDGE_UNAUTHORIZED');
    if (req.method==='OPTIONS') {
      res.writeHead(204,{'access-control-allow-origin':origin||'http://localhost:5173','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'x-hive-local-token, content-type','vary':'Origin'});
      return res.end();
    }
    const headers={'content-type':'application/json','cache-control':'no-store'};
    if(origin) headers['access-control-allow-origin']=origin;
    if(req.method==='GET'&&req.url==='/health'){res.writeHead(200,headers);return res.end(JSON.stringify({status:'LOCAL_ONLY',autonomy:'OFF'}));}
    if(req.method!=='POST'||req.url!=='/inference')return reject(404,'HIVE_NOT_FOUND');
    if(busy)return reject(429,'HIVE_BRIDGE_BUSY');
    busy=true;
    try {
      let body='';
      for await (const chunk of req){body+=chunk.toString();if(body.length>5000)throw Error('HIVE_BODY_TOO_LARGE');}
      const parsed=JSON.parse(body);
      if(!parsed||typeof parsed.prompt!=='string'||parsed.prompt.length>4000||Object.keys(parsed).some(k=>k!=='prompt'))
        throw Error('HIVE_INVALID_BODY');
      const task={id:'hive-local-ui',prompt:parsed.prompt,model:'qwen3-coder-free',capability:'inference-only',requires_approval:false};
      const output=await run({task,policy});
      res.writeHead(200,headers);res.end(JSON.stringify(output));
    } catch(err) {reject(422,err?.message==='HIVE_FREEAPI_RATE_LIMITED: proveedor sin cuota temporal; no se reintenta automáticamente'?'HIVE_FREEAPI_RATE_LIMITED':'HIVE_LOCAL_INFERENCE_FAILED');}
    finally {busy=false;}
  });
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
 const token=process.env.HIVE_LOCAL_BRIDGE_TOKEN;
 const policy=JSON.parse(await readFile(new URL('../docs/UGO_SCHEDULER_POLICY.json',import.meta.url),'utf8'));
 const server=createHiveLocalBridge({token,policy});
 server.listen(3037,'127.0.0.1',()=>console.log('Hive local bridge listening on 127.0.0.1:3037'));
}
