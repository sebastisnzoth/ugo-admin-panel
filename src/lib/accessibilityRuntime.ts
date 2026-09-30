const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function visible(el:HTMLElement){
 const style=getComputedStyle(el)
 return style.visibility!=='hidden'&&style.display!=='none'&&el.getClientRects().length>0
}
function topDialog(){
 const dialogs=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')).filter(visible)
 return dialogs.at(-1)||null
}
function focusables(root:HTMLElement){
 return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible)
}
function focusDialog(dialog:HTMLElement){
 if(dialog.dataset.ugoA11yFocused==='1')return
 dialog.dataset.ugoA11yFocused='1'
 if(!dialog.hasAttribute('tabindex'))dialog.tabIndex=-1
 const first=focusables(dialog)[0]||dialog
 queueMicrotask(()=>first.focus({preventScroll:true}))
}

export function installAccessibilityRuntime(){
 if(typeof document==='undefined'||document.documentElement.dataset.ugoA11yRuntime==='1')return
 document.documentElement.dataset.ugoA11yRuntime='1'

 const observer=new MutationObserver(()=>{
  const dialog=topDialog()
  if(dialog)focusDialog(dialog)
 })
 observer.observe(document.body,{childList:true,subtree:true})

 document.addEventListener('keydown',event=>{
  const dialog=topDialog()
  if(!dialog)return
  if(event.key==='Escape'){
   const close=focusables(dialog).find(el=>{
    const name=(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').toLowerCase()
    return /cerrar|close|voltar|volver/.test(name)
   })
   if(close instanceof HTMLElement){event.preventDefault();close.click()}
   return
  }
  if(event.key!=='Tab')return
  const items=focusables(dialog)
  if(!items.length){event.preventDefault();dialog.focus();return}
  const first=items[0],last=items[items.length-1],active=document.activeElement
  if(event.shiftKey&&active===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&active===last){event.preventDefault();first.focus()}
 })

 const existing=topDialog()
 if(existing)focusDialog(existing)
}
