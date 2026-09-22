import{useEffect}from'react'
import type{ClientHugoIntent}from'../types/clientTypes'

type PublishHugoIntent=(intent:Omit<ClientHugoIntent,'id'>)=>void

export function useClientCategoryShortcut(publishHugoIntent:PublishHugoIntent){
 useEffect(()=>{
  // Service cards are themselves an entry point to the order journey on
  // mobile. Keep Home reusable while routing the tap into the canonical request.
  const onCategoryTap=(event:MouseEvent)=>{
   const target=event.target instanceof Element?event.target.closest<HTMLButtonElement>('.ugo-studio-services button'):null
   if(!target||target.disabled)return
   const label=target.querySelector('strong')?.textContent?.trim()
   if(!label)return
   window.setTimeout(()=>publishHugoIntent({text:`Necesito ${label}`,categoryHint:label,urgent:false,description:null}),0)
  }
  document.addEventListener('click',onCategoryTap)
  return()=>document.removeEventListener('click',onCategoryTap)
 },[publishHugoIntent])
}
