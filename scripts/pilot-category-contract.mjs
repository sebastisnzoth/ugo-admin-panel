import fs from'node:fs'
const files=[
 'src/features/client/request/ClientNeedScreen.tsx',
 'src/features/client/request/ClientWhenScreen.tsx',
 'src/features/client/request/ClientPostConfirmFlow.tsx',
 'src/features/client/request/ClientSummaryScreen.tsx',
 'src/mvp/provider/providerData.tsx',
 'supabase/migrations/20260930151500_pilot_faxina_marido_categories.sql',
 'docs/UGO_PILOT_FAXINA_MARIDO_DE_ALUGUEL.md'
]
const text=Object.fromEntries(files.map(file=>[file,fs.readFileSync(file,'utf8')]))
const checks=[
 ['categories seeded',/faxina/.test(text[files[5]])&&/marido-de-aluguel/.test(text[files[5]])],
 ['faxina required form',/Datos que necesita la faxinera/.test(text[files[0]])&&/productsBy/.test(text[files[0]])&&/equipmentBy/.test(text[files[0]])],
 ['marido required form',/Datos que necesita el profesional/.test(text[files[0]])&&/materials/.test(text[files[0]])&&/height/.test(text[files[0]])],
 ['start/end scheduling',/scheduleEndAt/.test(text[files[1]])&&/Hasta/.test(text[files[1]])],
 ['metadata persisted',/pilot_details/.test(text[files[2]])&&/scheduled_end_at/.test(text[files[2]])],
 ['provider receives detail',/scheduled_end_at/.test(text[files[4]])&&/preferences/.test(text[files[4]])],
 ['same-SHA gate documented',/mismo SHA/.test(text[files[6]])&&/Judge\/Sentinel/.test(text[files[6]])]
]
const failed=checks.filter(([,ok])=>!ok)
for(const[name,ok]of checks)console.log(ok?'PASS':'FAIL',name)
if(failed.length)process.exit(1)
console.log('PASS pilot contract static gate')
