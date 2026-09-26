export type CameraCaptureResult={file:File|null;error?:string}

function cameraErrorMessage(error:unknown){const name=error instanceof DOMException?error.name:'';if(name==='NotAllowedError'||name==='SecurityError')return'Permiso de cámara bloqueado. Habilitá Cámara para este sitio en el navegador y probá otra vez.';if(name==='NotFoundError'||name==='DevicesNotFoundError')return'No encontramos una cámara disponible en este dispositivo.';if(name==='NotReadableError'||name==='TrackStartError')return'La cámara está siendo usada por otra aplicación o no está disponible.';return'No pudimos abrir la cámara. Revisá el permiso de Cámara del navegador y probá otra vez.'}

function pickCameraFile():Promise<CameraCaptureResult>{return new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept='image/*';input.setAttribute('capture','environment');input.style.position='fixed';input.style.left='-9999px';input.onchange=()=>{const file=input.files?.[0]||null;input.remove();resolve({file})};input.oncancel=()=>{input.remove();resolve({file:null})};document.body.appendChild(input);input.click()})}\n\nexport async function capturePhotoFromCamera():Promise<CameraCaptureResult>{
 if(!window.isSecureContext)return{file:null,error:'La cámara requiere una conexión segura HTTPS.'}
 if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||!navigator.mediaDevices?.getUserMedia)return pickCameraFile()
 let stream:MediaStream|null=null
 try{
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})
  const video=document.createElement('video');video.playsInline=true;video.muted=true;video.srcObject=stream
  await video.play();if(!video.videoWidth||!video.videoHeight)await new Promise<void>(resolve=>{video.onloadedmetadata=()=>resolve()})
  const canvas=document.createElement('canvas');canvas.width=video.videoWidth||1280;canvas.height=video.videoHeight||720;canvas.getContext('2d')?.drawImage(video,0,0,canvas.width,canvas.height)
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));if(!blob)throw new Error('CAPTURE_FAILED')
  return{file:new File([blob],`ugo-camera-${Date.now()}.jpg`,{type:'image/jpeg',lastModified:Date.now()})}
 }catch(error){if(error instanceof DOMException&&(error.name==='NotFoundError'||error.name==='DevicesNotFoundError'))return pickCameraFile();return{file:null,error:cameraErrorMessage(error)}}finally{stream?.getTracks().forEach(track=>track.stop())}
}
