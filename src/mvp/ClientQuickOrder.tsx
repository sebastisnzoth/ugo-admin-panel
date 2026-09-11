import React from'react'

export const UGO_CLIENT_GUIDED_REQUEST_OPEN='ugo:client-guided-request-open'

/**
 * Compatibility bridge for old surfaces that still render ClientQuickOrder.
 * It no longer creates services. It only opens the canonical Hugo-guided
 * request flow handled by ClientGuidedRequest.
 */
export function ClientQuickOrder(){
 function openCanonicalRequest(){window.dispatchEvent(new Event(UGO_CLIENT_GUIDED_REQUEST_OPEN))}
 return <button type="button" onClick={openCanonicalRequest} style={{position:'fixed',left:'50%',bottom:148,transform:'translateX(-50%)',zIndex:80,border:0,borderRadius:999,padding:'13px 22px',fontWeight:950,fontSize:15,boxShadow:'0 12px 30px rgba(0,0,0,.22)',cursor:'pointer'}}>✨ Pedir un servicio</button>
}
