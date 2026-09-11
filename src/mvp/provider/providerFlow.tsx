import React,{createContext,useCallback,useContext,useMemo,useRef,useState}from'react'
import type{ProviderActionHandlers,ProviderScreen}from'./providerTypes'

const noop=()=>{}
const unavailable=async()=>false
const emptyActions:ProviderActionHandlers={openHome:noop,openDemand:noop,openOpportunities:noop,openOpportunity:noop,acceptOpportunity:unavailable,rejectOpportunity:unavailable,openActiveJob:noop,openEarnings:noop,openProfile:noop,openHistory:noop,openDispute:noop}

type ProviderFlow={screen:ProviderScreen;opportunityId:string|null;actions:ProviderActionHandlers;navigate:(screen:ProviderScreen,id?:string|null)=>void;registerActions:(actions:Partial<ProviderActionHandlers>)=>()=>void}
const ProviderFlowContext=createContext<ProviderFlow|null>(null)

export function ProviderFlowProvider({children}:{children:React.ReactNode}){
 const[screen,setScreen]=useState<ProviderScreen>('home')
 const[opportunityId,setOpportunityId]=useState<string|null>(null)
 const handlersRef=useRef<Partial<ProviderActionHandlers>>({})
 const navigate=useCallback((next:ProviderScreen,id:string|null=null)=>{setScreen(next);setOpportunityId(id)},[])
 const registerActions=useCallback((next:Partial<ProviderActionHandlers>)=>{handlersRef.current={...handlersRef.current,...next};return()=>{for(const key of Object.keys(next)as Array<keyof ProviderActionHandlers>)delete handlersRef.current[key]}},[])
 const actions=useMemo(()=>Object.fromEntries((Object.keys(emptyActions)as Array<keyof ProviderActionHandlers>).map(key=>[key,(...args:never[])=>{const handler=handlersRef.current[key]||emptyActions[key];return(handler as(...values:never[])=>unknown)(...args)}]))as ProviderActionHandlers,[])
 return <ProviderFlowContext.Provider value={{screen,opportunityId,actions,navigate,registerActions}}>{children}</ProviderFlowContext.Provider>
}
export function useProviderFlow(){const value=useContext(ProviderFlowContext);if(!value)throw new Error('useProviderFlow debe usarse dentro de ProviderFlowProvider');return value}
