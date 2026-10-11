import{useEffect,useRef}from'react'

/**
 * Comportamiento de cambio de pantalla en mobile:
 * 1. vuelve el scroll al inicio (evita aterrizar a mitad de pantalla),
 * 2. mueve el foco al encabezado de la nueva pantalla cuando el elemento
 *    enfocado anterior ya no existe (lectores de pantalla y teclado),
 * 3. respeta `prefers-reduced-motion`.
 */
export function useScreenFocus(screen:string){
 const previous=useRef(screen)
 useEffect(()=>{
  if(previous.current===screen)return
  previous.current=screen
  try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch{/* scroll bloqueado por el navegador */}
  const active=document.activeElement as HTMLElement|null
  const stale=!active||active===document.body||!document.contains(active)
  if(!stale)return
  const heading=document.querySelector<HTMLElement>('[data-ux-screen-heading]')
  if(heading&&typeof heading.focus==='function')heading.focus({preventScroll:true})
 },[screen])
}
