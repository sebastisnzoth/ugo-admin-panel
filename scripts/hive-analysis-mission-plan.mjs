// Deterministic, read-only orchestration plan. No model decides execution privileges.
export const HIVE_AGENTS=Object.freeze(['Hugo','Architect','Developer','QA','Security','DevOps','Judge','Sentinel','Research']);
const DEFAULT_FLOW=Object.freeze(['Hugo','Architect','Developer','QA','Security','Judge']);
export function planHiveAnalysisMission({missionId,objective,flow=DEFAULT_FLOW,maxTasks=9}={}){
 if(typeof missionId!=='string'||!/^[-a-zA-Z0-9_]{1,64}$/.test(missionId))throw Error('HIVE_INVALID_MISSION_ID');
 if(typeof objective!=='string'||!objective.trim()||objective.length>1800)throw Error('HIVE_INVALID_OBJECTIVE');
 if(!Number.isInteger(maxTasks)||maxTasks<1||maxTasks>9)throw Error('HIVE_INVALID_MISSION_BUDGET');
 if(!Array.isArray(flow)||flow.length<1||flow.length>maxTasks||new Set(flow).size!==flow.length||
  flow.some(agent=>!HIVE_AGENTS.includes(agent)))throw Error('HIVE_INVALID_MISSION_FLOW');
 return Object.freeze({
  mission_id:missionId, capability:'inference-only', autonomy:false, concurrency:1,
  tasks:flow.map((agent,i)=>Object.freeze({
   id:missionId+'-'+String(i+1),agent,dependency:i?missionId+'-'+String(i):null,
   prompt:objective,capability:'inference-only',status:'PENDING'
  }))
 });
}
export function nextHiveAnalysisTask(plan,results={}){
 if(!plan||!Array.isArray(plan.tasks)||plan.capability!=='inference-only'||plan.autonomy!==false)return null;
 for(const task of plan.tasks){
  if(Object.prototype.hasOwnProperty.call(results,task.id))continue;
  if(task.dependency&&!Object.prototype.hasOwnProperty.call(results,task.dependency))return null;
  if(task.dependency&&results[task.dependency]?.status!=='SUCCEEDED')return null;
  return task;
 }
 return null;
}
