import React,{useMemo,useState}from'react'

type PixType='CPF'|'CNPJ'|'EMAIL'|'PHONE'|'EVP'
type Locale='pt-BR'|'es'|'en'
const COPY={
 'pt-BR':{
  title:'Meus recebimentos · Asaas Pix',subtitle:'Configure onde deseja receber transferências depois que seu saldo estiver disponível.',
  split:'Nos serviços pagos com Asaas, a divisão é automática: 85% para o profissional e 15% para a UGO sobre o valor líquido.',
  account:'Conta Asaas do profissional',accountPending:'Subconta ainda não vinculada ou verificada',
  key:'Chave Pix para saques externos',type:'Tipo de chave',placeholder:'Digite sua chave Pix',save:'Salvar chave Pix',
  disabled:'Cadastro de chaves em preparação. Nenhuma informação será salva até a conexão segura com o ambiente de testes.',
  help:'A chave Pix não substitui o walletId da subconta Asaas. Sem verificação de titularidade e backend seguro, não é possível habilitar saques.',
  invalid:'Formato de chave Pix inválido.',valid:'Formato válido; ainda falta validar a titularidade.',
 },
 es:{
  title:'Mis cobros · Asaas Pix',subtitle:'Configurá dónde recibir transferencias cuando tengas saldo disponible.',
  split:'En servicios pagados por Asaas, el reparto es automático: 85% para el profesional y 15% para UGO sobre el valor neto.',
  account:'Cuenta Asaas del proveedor',accountPending:'Subcuenta sin vincular ni verificar',
  key:'Clave Pix para retiros externos',type:'Tipo de clave',placeholder:'Ingresá tu clave Pix',save:'Guardar clave Pix',
  disabled:'Registro de claves en preparación. No se guardará información hasta conectar de forma segura el entorno de pruebas.',
  help:'La clave Pix no reemplaza al walletId de la subcuenta Asaas. Los retiros requieren validación de titularidad y backend seguro.',
  invalid:'Formato de clave Pix inválido.',valid:'Formato válido; falta validar la titularidad.',
 },
 en:{
  title:'My payouts · Asaas Pix',subtitle:'Set where to receive transfers once your balance is available.',
  split:'For Asaas payments, the automatic net split is 85% to the professional and 15% to UGO.',
  account:'Professional Asaas account',accountPending:'Subaccount not yet linked or verified',
  key:'Pix key for external withdrawals',type:'Key type',placeholder:'Enter Pix key',save:'Save Pix key',
  disabled:'Pix key registration is being prepared. No information is saved until the secure test integration is ready.',
  help:'A Pix key does not replace the Asaas subaccount walletId. Withdrawals require account ownership checks and a secure backend.',
  invalid:'Invalid Pix key format.',valid:'Valid format; account ownership still needs verification.',
 }
} as const

export function validatePixKey(type:PixType,value:string):boolean{
 const v=value.trim()
 switch(type){
  case 'CPF': return /^[0-9]{11}$/.test(v)
  case 'CNPJ': return /^[0-9]{14}$/.test(v)
  case 'EMAIL': return v.length<=254 && /^[^ @]+@[^ @]+\.[^ @]+$/.test(v)
  case 'PHONE': return /^[0-9]{11}$/.test(v)
  case 'EVP': return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v)
 }
}

/**
 * Preview-only, not a functioning withdrawal or account-registration endpoint.
 * Never writes Pix keys to localStorage, Supabase or the existing legacy payout field.
 */
export function ProviderAsaasRecebimentos({locale}:{locale:string}){
 const lang:Locale=locale==='es'?'es':locale==='en'?'en':'pt-BR'
 const l=COPY[lang]
 const[type,setType]=useState<PixType>('CPF')
 const[key,setKey]=useState('')
 const valid=useMemo(()=>!key.trim()||validatePixKey(type,key),[type,key])
 return <section className="ugo-asaas-recebimentos" aria-label={l.title}>
  <header className="ugo-asaas-recebimentos-head"><span className="ugo-asaas-recebimentos-icon" aria-hidden="true">◇</span><div><strong>{l.title}</strong><p>{l.subtitle}</p></div></header>
  <div className="ugo-asaas-split"><span>UGO 15%</span><span>Profissional 85%</span></div>
  <p className="ugo-asaas-note">{l.split}</p>
  <div className="ugo-asaas-account"><strong>{l.account}</strong><span className="ugo-asaas-pending">{l.accountPending}</span></div>
  <fieldset disabled className="ugo-asaas-pix-fields"><legend>{l.key}</legend>
   <label htmlFor="ugo-asaas-pix-type">{l.type}</label>
   <select id="ugo-asaas-pix-type" value={type} onChange={e=>{setType(e.target.value as PixType);setKey('')}}>
    <option value="CPF">CPF</option><option value="CNPJ">CNPJ</option><option value="EMAIL">E-mail</option><option value="PHONE">Celular (DDD + número)</option><option value="EVP">Chave aleatória</option>
   </select>
   <label htmlFor="ugo-asaas-pix-key">{l.key}</label>
   <input id="ugo-asaas-pix-key" type="text" autoComplete="off" spellCheck={false} value={key} onChange={e=>setKey(e.target.value)} placeholder={l.placeholder} aria-invalid={!valid} />
   <button type="button" disabled>{l.save}</button>
  </fieldset>
  <p className="ugo-asaas-locked" role="status">{l.disabled}</p>
  <p className="ugo-asaas-note">{l.help}</p>
 </section>
}
