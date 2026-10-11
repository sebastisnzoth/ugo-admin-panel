import React,{useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'

type Props={name?:string|null;role:'client'|'provider'|'admin';photoPath?:string|null;photoUrl?:string|null;size?:number;className?:string}
const bucketFor=(role:Props['role'])=>role==='client'?'client-public':role==='provider'?'provider-public':'client-public'
const initials=(name?:string|null)=>String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toLocaleUpperCase()).join('')||'UGO'

/** Shared identity avatar. Prefer a persisted profile photo and always fall back to initials. */
export function UserProfileAvatar({name,role,photoPath,photoUrl,size=40,className}:Props){
 const[failed,setFailed]=useState(false)
 const src=useMemo(()=>photoUrl||(photoPath?getRoleSupabase(role).storage.from(bucketFor(role)).getPublicUrl(photoPath).data.publicUrl:null),[photoPath,photoUrl,role])
 React.useEffect(()=>setFailed(false),[src])
 const label=name?'Foto de perfil de '+name:'Foto de perfil'
 const style:React.CSSProperties={width:size,height:size,minWidth:size,borderRadius:'50%',overflow:'hidden',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#e7f3ec',color:'#176b4a',fontWeight:750,fontSize:Math.max(11,Math.round(size*.34)),lineHeight:1,flexShrink:0,objectFit:'cover'}
 return <span className={className} role={src&&!failed?'img':undefined} aria-label={src&&!failed?label:undefined} style={style}>{src&&!failed?<img src={src} alt={label} onError={()=>setFailed(true)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:initials(name)}</span>
}
