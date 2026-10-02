import{canExecuteHugoUiAction,canNavigateHugoTarget,type HugoRole}from'./permissions'
import{clean}from'./security'

type JsonRecord=Record<string,unknown>
const asRecord=(value:unknown):JsonRecord=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{}
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const NAV_TARGETS=new Set(['home','operations:overview','operations:map','operations:services','operations:alerts','operations:disputes','operations:scout','operations:history','operations:messages','people:users','people:verification','people:documents','people:kyc','people:import','finance:pix','finance:vault','finance:tariffs','settings:categories','settings:analytics','settings:notifications','settings:reports','settings:system','superadmin'])

export function parseHugoUiAction(value:unknown,role:HugoRole){
 if(!value||typeof value!=='object')return null
 const raw=asRecord(value),type=clean(raw.type,30)
 if(type==='refresh')return canExecuteHugoUiAction(role,'refresh')?{type:'refresh'}:null
 if(type==='navigate'){
  const target=clean(raw.target,80)
  if(!NAV_TARGETS.has(target)||!canNavigateHugoTarget(role,target))return null
  return{type:'navigate',target}
 }
 if(type==='open_service'){
  if(!canExecuteHugoUiAction(role,'open_service'))return null
  const serviceId=clean(raw.service_id,80),number=Number(raw.service_number)
  if(serviceId&&!UUID_RE.test(serviceId))return null
  if(!serviceId&&!Number.isFinite(number))return null
  return{type:'open_service',service_id:serviceId||undefined,service_number:Number.isFinite(number)?number:undefined}
 }
 if(type==='map_filter'){
  if(!canExecuteHugoUiAction(role,'map_filter'))return null
  const status=['todos','online','offline','inactivo'].includes(String(raw.status))?String(raw.status):undefined
  const category=clean(raw.category,80)||null,zone=clean(raw.zone,120)||null,place=clean(raw.place,160)||null
  const radius=Number(raw.radius_m),showProviders=typeof raw.show_providers==='boolean'?raw.show_providers:null,showClients=typeof raw.show_clients==='boolean'?raw.show_clients:null
  return{type:'map_filter',status,category,zone,place,radius_m:Number.isFinite(radius)?Math.max(0,Math.min(50000,radius)):null,show_providers:showProviders,show_clients:showClients}
 }
 return null
}
