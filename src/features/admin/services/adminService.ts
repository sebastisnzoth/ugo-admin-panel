export type AdminOverview={ready:boolean}

export async function getAdminOverview():Promise<AdminOverview>{
 return {ready:true}
}
