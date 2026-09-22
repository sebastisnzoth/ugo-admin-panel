import React,{forwardRef}from'react'

export type ButtonProps=React.ButtonHTMLAttributes<HTMLButtonElement>&{
 variant?:'primary'|'secondary'|'danger'|'ghost'
 size?:'sm'|'md'|'lg'
 loading?:boolean
}
export const Button=forwardRef<HTMLButtonElement,ButtonProps>(function Button({variant='secondary',size='md',loading=false,className='',disabled,children,...props},ref){
 return <button ref={ref} className={'ugo-ui-button ugo-ui-button--'+variant+' ugo-ui-button--'+size+' '+className} disabled={disabled||loading} aria-busy={loading||undefined}{...props}>{loading?'Procesando…':children}</button>
})
export const Input=forwardRef<HTMLInputElement,React.InputHTMLAttributes<HTMLInputElement>>(function Input({className='',...props},ref){return <input ref={ref} className={'ugo-ui-field '+className}{...props}/>})
export const Select=forwardRef<HTMLSelectElement,React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({className='',children,...props},ref){return <select ref={ref} className={'ugo-ui-field '+className}{...props}>{children}</select>})
export const Textarea=forwardRef<HTMLTextAreaElement,React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({className='',...props},ref){return <textarea ref={ref} className={'ugo-ui-field ugo-ui-textarea '+className}{...props}/>})
export function Card({className='',children,...props}:React.HTMLAttributes<HTMLElement>){return <section className={'ugo-ui-card '+className}{...props}>{children}</section>}
export function Badge({className='',children,...props}:React.HTMLAttributes<HTMLSpanElement>){return <span className={'ugo-ui-badge '+className}{...props}>{children}</span>}
export function StatusPill({tone='neutral',className='',children,...props}:React.HTMLAttributes<HTMLSpanElement>&{tone?:'neutral'|'success'|'warning'|'danger'}){return <span className={'ugo-ui-status ugo-ui-status--'+tone+' '+className}{...props}>{children}</span>}
export function Modal({open,onClose,label,children}:React.PropsWithChildren<{open:boolean;onClose:()=>void;label:string}>){if(!open)return null;return <div className="ugo-ui-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="ugo-ui-modal" role="dialog" aria-modal="true" aria-label={label}>{children}</section></div>}
export function TabList({children,className='',...props}:React.HTMLAttributes<HTMLDivElement>){return <div role="tablist" className={'ugo-ui-tabs '+className}{...props}>{children}</div>}
export function Tab({selected=false,children,className='',...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{selected?:boolean}){return <button type="button" role="tab" aria-selected={selected} className={'ugo-ui-tab '+className}{...props}>{children}</button>}
export function TabPanel({children,...props}:React.HTMLAttributes<HTMLDivElement>){return <div role="tabpanel"{...props}>{children}</div>}
export function SectionHeader({title,eyebrow,description,actions}:Readonly<{title:string;eyebrow?:string;description?:string;actions?:React.ReactNode}>){return <header className="ugo-ui-section-header"><div>{eyebrow&&<small>{eyebrow}</small>}<h2>{title}</h2>{description&&<p>{description}</p>}</div>{actions&&<div>{actions}</div>}</header>}
export function EmptyState({title,description,action}:Readonly<{title:string;description?:string;action?:React.ReactNode}>){return <div className="ugo-ui-empty"><strong>{title}</strong>{description&&<span>{description}</span>}{action}</div>}
export function LoadingState({label='Cargando…'}:{label?:string}){return <div className="ugo-ui-loading" role="status"><span>{label}</span></div>}
