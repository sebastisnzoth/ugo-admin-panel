import React from'react'
import'./ugo-demo-boundary.css'

export function UgoDemoBoundary({children}:{children:React.ReactNode}){
 return <div className="ugo-demo-boundary"><div className="ugo-demo-boundary-banner" role="status" aria-label="Entorno de demostración"><strong>DEMO · DATOS FICTICIOS</strong><span>No representa la operación real de UGO.</span></div>{children}</div>
}
