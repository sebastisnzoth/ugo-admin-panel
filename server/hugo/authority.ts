export type HugoRequestedRole='client'|'provider'|'admin'|'superadmin'
export type HugoProfileRole='cliente'|'proveedor'|'admin'|'superadmin'|string
export type HugoAuthorityDecision={allowed:boolean;requestedRole:HugoRequestedRole;profileRole:string;code:'ALLOW'|'INACTIVE_PROFILE'|'ROLE_MISMATCH';reason:string}

export function normalizeHugoRequestedRole(value:unknown):HugoRequestedRole{
 const role=String(value||'client').trim().toLowerCase()
 return role==='provider'||role==='admin'||role==='superadmin'?role:'client'
}

export function decideHugoAuthority(requestedRole:HugoRequestedRole,profileRole:HugoProfileRole,active:boolean):HugoAuthorityDecision{
 const actual=String(profileRole||'')
 if(!active)return{allowed:false,requestedRole,profileRole:actual,code:'INACTIVE_PROFILE',reason:'Tu perfil UGO está inactivo; Hugo no puede ejecutar acciones hasta que vuelva a estar habilitado.'}
 const allowed=requestedRole==='client'?actual==='cliente':requestedRole==='provider'?actual==='proveedor':requestedRole==='admin'?actual==='admin'||actual==='superadmin':actual==='superadmin'
 if(allowed)return{allowed:true,requestedRole,profileRole:actual,code:'ALLOW',reason:'Acción autorizada para el rol verificado.'}
 const label=requestedRole==='superadmin'?'Super Admin':requestedRole==='admin'?'Admin':requestedRole==='provider'?'Proveedor':'Cliente'
 return{allowed:false,requestedRole,profileRole:actual,code:'ROLE_MISMATCH',reason:`Esta acción requiere autoridad ${label}; tu sesión verificada tiene rol ${actual||'sin rol'}.`}
}
