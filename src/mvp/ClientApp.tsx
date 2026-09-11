import React from'react'
import{ClientRoot}from'./client/ClientRoot'

/**
 * Legacy compatibility entrypoint.
 *
 * The canonical client runtime is ClientRoot + ClientGuidedRequest. Keeping
 * this export prevents old imports from breaking while ensuring there is only
 * one service-request creation flow in the product.
 */
export function ClientApp(){
 return <ClientRoot demo={false}/>
}
