import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider earnings business IO lives in feature service',async()=>{const screen=await read('src/mvp/provider/ProviderEarnings.tsx'),service=await read('src/features/provider/services/providerEarningsService.ts');assert.doesNotMatch(screen,/getRoleSupabase|informar_pago_deuda_ugo|\/api\/test\?ugo_debt=1/);assert.match(service,/informar_pago_deuda_ugo/);assert.match(service,/\/api\/test\?ugo_debt=1/);assert.match(service,/Authorization:\`Bearer \$\{accessToken\}\`/)})
test('provider category IO lives in feature service',async()=>{const screen=await read('src/mvp/provider/ProviderCategoriesEditor.tsx'),service=await read('src/features/provider/services/providerCategoriesService.ts');assert.doesNotMatch(screen,/getRoleSupabase|guardar_categorias_proveedor|\.from\('categorias'\)/);assert.match(service,/guardar_categorias_proveedor/);assert.match(service,/\.from\('categorias'\)/);assert.match(service,/\.from\('usuarios'\)/)})
