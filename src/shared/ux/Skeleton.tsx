import React from'react'

type Size=string|number
export type SkeletonProps={className?:string;width?:Size;height?:Size;radius?:Size}

const cssSize=(value:Size|undefined)=>value===undefined?undefined:typeof value==='number'?`${value}px`:value

/**
 * Placeholder de carga con la geometría real del contenido para evitar saltos
 * de layout (CLS) mientras llegan los datos persistidos.
 */
export function Skeleton({className,width,height,radius}:SkeletonProps){
 const style:React.CSSProperties={}
 const resolved={width:cssSize(width),height:cssSize(height),borderRadius:cssSize(radius)}
 if(resolved.width)style.width=resolved.width
 if(resolved.height)style.height=resolved.height
 if(resolved.borderRadius)style.borderRadius=resolved.borderRadius
 return <span aria-hidden="true" className={`ugo-ds-skeleton ugo-ux-skeleton${className?` ${className}`:''}`} style={style}/>
}

/** Bloque de texto con varias líneas, la última más corta. */
export function SkeletonText({lines=3,className}:{lines?:number;className?:string}){
 return <span className={`ugo-ux-skeleton-text${className?` ${className}`:''}`} aria-hidden="true">
  {Array.from({length:Math.max(1,lines)},(_,index)=><Skeleton key={index} height={12} radius="var(--ugo-radius-sm)" className={index===Math.max(1,lines)-1?'is-short':undefined}/>)}
 </span>
}

/** Tarjeta de carga: encabezado + líneas + acción. */
export function SkeletonCard({lines=3,action=true,className}:{lines?:number;action?:boolean;className?:string}){
 return <div className={`ugo-ux-skeleton-card${className?` ${className}`:''}`} aria-hidden="true">
  <Skeleton height={14} width="45%" radius="var(--ugo-radius-sm)"/>
  <SkeletonText lines={lines}/>
  {action&&<Skeleton height={40} radius="var(--ugo-radius-md)"/>}
 </div>
}

/** Fila de tarjetas de carga para listas (pedidos, agenda, oportunidades). */
export function SkeletonList({count=3,lines=2,className}:{count?:number;lines?:number;className?:string}){
 return <div className={`ugo-ux-skeleton-list${className?` ${className}`:''}`} aria-hidden="true">
  {Array.from({length:Math.max(1,count)},(_,index)=><SkeletonCard key={index} lines={lines} action={false}/>)}
 </div>
}
