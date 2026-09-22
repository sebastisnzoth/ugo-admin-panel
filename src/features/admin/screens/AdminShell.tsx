import React from'react'
import{Card,SectionHeader,StatusPill}from'../../../shared/ui'
import{useAdminShell}from'../hooks/useAdminShell'

export function AdminShell(){
 const{data}=useAdminShell()
 return <main className="ugo-admin-feature-shell"><SectionHeader eyebrow="U.GO · ADMIN" title="Panel de control" description="Base modular del panel administrativo."/>
  <Card><StatusPill tone={data?.ready?'success':'neutral'}>{data?.ready?'Administración disponible':'Cargando administración…'}</StatusPill><p>La autenticación y autorización siguen protegidas por AdminGate mientras los módulos operativos se migran a features/admin.</p></Card>
 </main>
}
