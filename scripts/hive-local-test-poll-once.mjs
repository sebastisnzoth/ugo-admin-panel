// Manual, one-shot TEST poll. Nothing starts at boot or runs on a timer.
// Requires a separately provisioned dedicated TEST worker credential.
import {readFile} from 'node:fs/promises';
import {processHivePoll} from './hive-local-poll-worker.mjs';
import {createHiveTestTransport} from './hive-local-test-transport.mjs';

export async function pollHiveTestOnce({token,policy,fetchImpl,run}={}) {
 const transport=createHiveTestTransport({token,fetchImpl});
 return processHivePoll({claim:transport.claim,complete:transport.complete,policy,run});
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
 const token=process.env.HIVE_TEST_WORKER_TOKEN;
 if(!token) throw Error('HIVE_TEST_WORKER_TOKEN_REQUIRED');
 const policy=JSON.parse(await readFile(new URL('../docs/UGO_SCHEDULER_POLICY.json',import.meta.url),'utf8'));
 const result=await pollHiveTestOnce({token,policy});
 process.stdout.write(JSON.stringify(result)+'\n');
}
