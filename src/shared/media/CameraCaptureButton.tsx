import React,{useCallback,useEffect,useRef,useState}from'react'
import'./cameraCapture.css'

type Props={
 disabled?:boolean
 busy?:boolean
 label?:React.ReactNode
 busyLabel?:React.ReactNode
 className?:string
 onPhoto:(file:File)=>void|Promise<void>
 onError?:(message:string)=>void
}

function cameraMessage(error:unknown){
 if(error instanceof DOMException){
  if(error.name==='NotAllowedError'||error.name==='SecurityError')return'La cámara está bloqueada. Habilitá el permiso de cámara para UGO en el navegador o en la app.'
  if(error.name==='NotFoundError'||error.name==='DevicesNotFoundError')return'No encontramos una cámara disponible en este dispositivo.'
  if(error.name==='NotReadableError'||error.name==='TrackStartError')return'La cámara está siendo usada por otra aplicación. Cerrala y probá de nuevo.'
 }
 return'No pudimos abrir la cámara. Podés usar “Elegir foto” como alternativa.'
}

export function CameraCaptureButton({disabled=false,busy=false,label='📷 Sacar foto',busyLabel='Abriendo cámara…',className='',onPhoto,onError}:Props){
 const videoRef=useRef<HTMLVideoElement|null>(null)
 const streamRef=useRef<MediaStream|null>(null)
 const fallbackRef=useRef<HTMLInputElement|null>(null)
 const[open,setOpen]=useState(false),[starting,setStarting]=useState(false),[error,setError]=useState('')

 const stopCamera=useCallback(()=>{
  streamRef.current?.getTracks().forEach(track=>track.stop())
  streamRef.current=null
  if(videoRef.current)videoRef.current.srcObject=null
 },[])

 useEffect(()=>()=>stopCamera(),[stopCamera])
 useEffect(()=>{
  if(!open||!videoRef.current||!streamRef.current)return
  videoRef.current.srcObject=streamRef.current
  void videoRef.current.play().catch(()=>{})
 },[open])

 function closeCamera(){stopCamera();setOpen(false)}

 async function startCamera(){
  if(disabled||busy||starting)return
  setError('')
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
   fallbackRef.current?.click()
   return
  }
  setStarting(true)
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})
   streamRef.current=stream
   setOpen(true)
  }catch(cameraError){
   const message=cameraMessage(cameraError)
   setError(message)
   onError?.(message)
  }finally{setStarting(false)}
 }

 async function capture(){
  const video=videoRef.current
  if(!video||!video.videoWidth||!video.videoHeight){
   const message='La cámara todavía no está lista. Probá de nuevo en un segundo.'
   setError(message);onError?.(message);return
  }
  const canvas=document.createElement('canvas')
  canvas.width=video.videoWidth
  canvas.height=video.videoHeight
  const context=canvas.getContext('2d')
  if(!context){
   const message='No pudimos preparar la foto. Usá “Elegir foto” como alternativa.'
   setError(message);onError?.(message);return
  }
  context.drawImage(video,0,0,canvas.width,canvas.height)
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.9))
  if(!blob){
   const message='No pudimos guardar la captura. Usá “Elegir foto” como alternativa.'
   setError(message);onError?.(message);return
  }
  const file=new File([blob],`ugo-camera-${Date.now()}.jpg`,{type:'image/jpeg',lastModified:Date.now()})
  closeCamera()
  await onPhoto(file)
 }

 return <div className="ugo-camera-action-wrap">
  <button type="button" className={className} disabled={disabled||busy||starting} onClick={()=>void startCamera()}>{busy?busyLabel:starting?'Abriendo cámara…':label}</button>
  <input ref={fallbackRef} className="ugo-camera-file-input" type="file" accept="image/*" capture="environment" disabled={disabled||busy} onChange={event=>{const file=event.currentTarget.files?.[0]||null;event.currentTarget.value='';if(file)void onPhoto(file)}}/>
  {error&&<small className="ugo-camera-inline-error" role="alert">{error}</small>}
  {open&&<div className="ugo-camera-modal" role="dialog" aria-modal="true" aria-label="Cámara de UGO">
   <div className="ugo-camera-sheet">
    <div className="ugo-camera-head"><strong>Sacar foto</strong><button type="button" onClick={closeCamera} aria-label="Cerrar cámara">×</button></div>
    <video ref={videoRef} className="ugo-camera-preview" autoPlay muted playsInline/>
    <div className="ugo-camera-actions"><button type="button" className="ugo-camera-cancel" onClick={closeCamera}>Cancelar</button><button type="button" className="ugo-camera-shutter" onClick={()=>void capture()}>● Tomar foto</button></div>
   </div>
  </div>}
 </div>
}
