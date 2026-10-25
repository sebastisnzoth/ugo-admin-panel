// UGO TEST browser harness: exercise the app's real, visible recovery once.
// Never fake a session, bypass a profile error, or inspect token values.
export async function waitForClientProfileUi(page,target,{initialTimeout=30000,recoveryTimeout=30000,onRecovered=()=>{}}={}){
 try{
  await target.waitFor({state:'visible',timeout:initialTimeout})
  return {recovered:false}
 }catch(initialError){
  const retry=page.getByRole('button',{name:/Reintentar carga del perfil/i})
  if(!(await retry.isVisible().catch(()=>false)))throw initialError
  const state=await page.evaluate(()=>({
   sessionPresent:Boolean(localStorage.getItem('ugo-test-client-auth')),
   loginPresent:Boolean(document.querySelector('[data-testid="auth-form"]')),
  }))
  if(!state.sessionPresent||state.loginPresent)throw new Error('CLIENT_PROFILE_RECOVERY_REQUIRES_VALID_SESSION_UI')
  await retry.click()
  await target.waitFor({state:'visible',timeout:recoveryTimeout})
  if(await page.locator('[data-testid="auth-form"]').count())throw new Error('CLIENT_PROFILE_RECOVERY_RETURNED_TO_LOGIN')
  await onRecovered()
  return {recovered:true}
 }
}
