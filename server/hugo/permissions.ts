export type HugoRole='client'|'provider'|'admin'|'superadmin'
export type HugoUiActionType='refresh'|'navigate'|'open_service'|'map_filter'

export type HugoPermissionPolicy={
 canReadOwnContext:boolean
 canReadOperationalContext:boolean
 canReadGlobalGovernance:boolean
 uiActions:ReadonlySet<HugoUiActionType>
}

const none=new Set<HugoUiActionType>()
const adminUi=new Set<HugoUiActionType>(['refresh','navigate','open_service','map_filter'])

export const HUGO_PERMISSION_MATRIX:Record<HugoRole,HugoPermissionPolicy>={
 client:{canReadOwnContext:true,canReadOperationalContext:false,canReadGlobalGovernance:false,uiActions:none},
 provider:{canReadOwnContext:true,canReadOperationalContext:false,canReadGlobalGovernance:false,uiActions:none},
 admin:{canReadOwnContext:true,canReadOperationalContext:true,canReadGlobalGovernance:false,uiActions:adminUi},
 superadmin:{canReadOwnContext:true,canReadOperationalContext:true,canReadGlobalGovernance:true,uiActions:adminUi},
}

export function canExecuteHugoUiAction(role:HugoRole,type:HugoUiActionType){
 return HUGO_PERMISSION_MATRIX[role].uiActions.has(type)
}

export function canNavigateHugoTarget(role:HugoRole,target:string){
 if(!canExecuteHugoUiAction(role,'navigate'))return false
 if(target==='superadmin')return role==='superadmin'
 return role==='admin'||role==='superadmin'
}
