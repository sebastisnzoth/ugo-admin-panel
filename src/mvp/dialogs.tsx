import React,{useCallback,useEffect,useRef,useState}from'react'
import{Modal,Button,Input}from'./shared'
import'./dialogs.css'

/**
 * UGO Dialog System — reemplazo de window.confirm / window.prompt / window.alert.
 *
 * API promise-based para migración mecánica de diálogos nativos:
 *   const {confirm,prompt,alert,node}=useDialog()
 *   if(await confirm({message:'¿Eliminar?'})){...}
 *   const motivo=await prompt({message:'Motivo',required:true})
 *   await alert({message:'Listo'})
 *   ...{node} en el JSX del componente
 *
 * Los diálogos nativos bloquean el event loop, no respetan el tema UGO y son un
 * hallazgo de auditoría (S-03). Este módulo los retira de todos los flujos.
 */

export type ConfirmDialogOptions={title?:string;message:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean}
export type PromptDialogOptions={title?:string;message:string;label?:string;defaultValue?:string;placeholder?:string;confirmLabel?:string;cancelLabel?:string;required?:boolean;inputType?:'text'|'password'|'email'|'number'}
export type AlertDialogOptions={title?:string;message:string;confirmLabel?:string}

type PendingRequest=
 |{kind:'confirm';options:ConfirmDialogOptions;resolve:(value:boolean)=>void}
 |{kind:'prompt';options:PromptDialogOptions;resolve:(value:string|null)=>void}
 |{kind:'alert';options:AlertDialogOptions;resolve:()=>void}

const normalizeConfirm=(input:ConfirmDialogOptions|string):ConfirmDialogOptions=>typeof input==='string'?{message:input}:input
const normalizePrompt=(input:PromptDialogOptions|string):PromptDialogOptions=>typeof input==='string'?{message:input}:input
const normalizeAlert=(input:AlertDialogOptions|string):AlertDialogOptions=>typeof input==='string'?{message:input}:input

export function useDialog(){
 const[pending,setPending]=useState<PendingRequest|null>(null)
 const[value,setValue]=useState('')
 const inputRef=useRef<HTMLInputElement|null>(null)

 const close=useCallback(()=>{setPending(null);setValue('')},[])

 const confirm=useCallback((input:ConfirmDialogOptions|string)=>new Promise<boolean>(resolve=>{
   setValue('');setPending({kind:'confirm',options:normalizeConfirm(input),resolve})
 }),[])

 const prompt=useCallback((input:PromptDialogOptions|string)=>new Promise<string|null>(resolve=>{
   const options=normalizePrompt(input);setValue(options.defaultValue??'');setPending({kind:'prompt',options,resolve})
 }),[])

 const alert=useCallback((input:AlertDialogOptions|string)=>new Promise<void>(resolve=>{
   setValue('');setPending({kind:'alert',options:normalizeAlert(input),resolve})
 }),[])

 // Foco inicial en el input de prompt y cierre con Escape
 useEffect(()=>{
   if(pending?.kind==='prompt')inputRef.current?.focus()
 },[pending])
 useEffect(()=>{
   if(!pending)return
   const onKey= (event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();if(pending.kind==='confirm')pending.resolve(false);else if(pending.kind==='prompt')pending.resolve(null);else pending.resolve();close()}}
   window.addEventListener('keydown',onKey)
   return()=>window.removeEventListener('keydown',onKey)
 },[pending,close])

 const submitPrompt=useCallback(()=>{
   if(!pending||pending.kind!=='prompt')return
   const options=pending.options
   if(options.required&&!value.trim())return
   pending.resolve(value);close()
 },[pending,value,close])

 const node=!pending?null:pending.kind==='confirm'?(
   <Modal open title={pending.options.title??'Confirmar acción'} onClose={()=>{pending.resolve(false);close()}}>
     <div className="ugo-dialog">
       <p className="ugo-dialog-message">{pending.options.message}</p>
       <div className="ugo-dialog-actions">
         <Button variant="secondary" onClick={()=>{pending.resolve(false);close()}}>{pending.options.cancelLabel??'Cancelar'}</Button>
         <Button variant={pending.options.danger?'danger':'primary'} onClick={()=>{pending.resolve(true);close()}}>{pending.options.confirmLabel??'Confirmar'}</Button>
       </div>
     </div>
   </Modal>
 ):pending.kind==='prompt'?(
   <Modal open title={pending.options.title??'Ingresá un valor'} onClose={()=>{pending.resolve(null);close()}}>
     <form className="ugo-dialog" onSubmit={event=>{event.preventDefault();submitPrompt()}}>
       <p className="ugo-dialog-message">{pending.options.message}</p>
       <label className="ugo-dialog-field">
         {pending.options.label&&<span>{pending.options.label}</span>}
         <Input ref={inputRef} type={pending.options.inputType??'text'} value={value} placeholder={pending.options.placeholder} onChange={event=>setValue(event.target.value)}/>
       </label>
       <div className="ugo-dialog-actions">
         <Button type="button" variant="secondary" onClick={()=>{pending.resolve(null);close()}}>{pending.options.cancelLabel??'Cancelar'}</Button>
         <Button type="submit" variant="primary" disabled={pending.options.required&&!value.trim()}>{pending.options.confirmLabel??'Aceptar'}</Button>
       </div>
     </form>
   </Modal>
 ):(
   <Modal open title={pending.options.title??'Aviso'} onClose={()=>{pending.resolve();close()}}>
     <div className="ugo-dialog">
       <p className="ugo-dialog-message">{pending.options.message}</p>
       <div className="ugo-dialog-actions">
         <Button variant="primary" onClick={()=>{pending.resolve();close()}}>{pending.options.confirmLabel??'Entendido'}</Button>
       </div>
     </div>
   </Modal>
 )

 return{confirm,prompt,alert,node}
}
