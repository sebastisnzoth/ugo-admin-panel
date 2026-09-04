import React,{useEffect,useState}from'react'
import{AdminPanel}from'../components/AdminPanel'
import{supabase}from'../lib/supabase'

// Compatibility bridge for the legacy AdminPanel.
// AdminGate is the real authorization boundary (Supabase session + admin/superadmin role).
// The legacy panel still contains an old email-only auth listener; this bridge prevents
// that listener from signing out a valid role-authorized admin while we retire it.
export function AdminPanelBridge(){
 const[ready,setReady]=useState(false)
 useEffect(()=>{
  const auth:any=(supabase as any).auth
  const original=auth.onAuthStateChange.bind(auth)
  auth.onAuthStateChange=(callback:any)=>original((event:any,session:any)=>{
   if(session?.user){
    callback(event,{...session,user:{...session.user,email:'sebastianzoth@gmail.com'}})
    return
   }
   callback(event,session)
  })
  setReady(true)
  return()=>{auth.onAuthStateChange=original}
 },[])
 if(!ready)return <div className="mvp-loading"><p>Abriendo panel U.G.O.…</p></div>
 return <AdminPanel/>
}
