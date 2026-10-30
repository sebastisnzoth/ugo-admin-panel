// Public, versioned knowledge only. No personal data or administrative actions.
export const UGO_LINKS=Object.freeze({
 client:'https://ugo-admin-panel.vercel.app/?app=client',
 provider:'https://ugo-admin-panel.vercel.app/?app=provider'
});
export const UGO_FAQ=Object.freeze([
 {audience:'client',q:'Como entrar ou criar minha conta de cliente?',a:'Acesse o aplicativo do cliente: '+UGO_LINKS.client+'. O login e o cadastro são realizados na aplicação, nunca neste chat.'},
 {audience:'provider',q:'Como entrar ou me cadastrar como profissional?',a:'Acesse o aplicativo do profissional: '+UGO_LINKS.provider+'. Faça seu cadastro ou login no fluxo próprio.'},
 {audience:'client',q:'Como solicitar um serviço?',a:'Entre como cliente, escolha o serviço e informe os dados solicitados. No piloto de Florianópolis, as categorias iniciais são Faxina e Marido de Aluguel.'},
 {audience:'client',q:'Como pedir Faxina?',a:'No formulário de Faxina informe se é casa, apartamento ou outro tipo de residência, número de ambientes, quartos e banheiros, duração de 1 a 12 horas e se deseja que o profissional leve produtos de limpeza.'},
 {audience:'client',q:'O profissional pode levar produtos de limpeza?',a:'Somente em Faxina. O profissional pode oferecer os produtos e informar o preço adicional. O cliente deve conferir e aprovar o adicional antes da cobrança.'},
 {audience:'client',q:'Como pedir Marido de Aluguel?',a:'Entre no aplicativo do cliente, selecione Marido de Aluguel e descreva o reparo ou tarefa. Preço e disponibilidade precisam ser confirmados no aplicativo.'},
 {audience:'client',q:'Como acompanhar uma solicitação ou pagamento?',a:'Use o aplicativo autenticado do cliente. Este chat público não consulta pedidos, confirma pagamentos nem acessa dados da sua conta.'},
 {audience:'provider',q:'Como receber solicitações de trabalho?',a:'Entre no aplicativo do profissional para consultar seu perfil, disponibilidade e ofertas. As ofertas efetivas dependem do fluxo operacional da plataforma.'},
 {audience:'provider',q:'Como configurar produtos de limpeza e o adicional?',a:'Em Faxina, o profissional pode ativar o fornecimento de produtos e informar o adicional em reais. Esse valor não é o preço do serviço e precisa ser aprovado pelo cliente.'},
 {audience:'provider',q:'Minha localização ou GPS não funciona. O que faço?',a:'Confira permissões de localização no navegador ou aplicativo e use a atualização de GPS no fluxo do profissional. Se persistir, procure suporte no aplicativo; este chat não controla GPS nem despachos.'},
 {audience:'provider',q:'Como verificar cadastro, documentos, ofertas ou pagamento?',a:'Acesse a área autenticada do profissional. Não envie senhas, documentos, tokens ou dados bancários neste chat.'},
 {audience:'all',q:'Quanto custa e quando haverá profissional disponível?',a:'Este chat não conhece preços ou disponibilidade em tempo real. Consulte os valores e as condições no aplicativo; não prometemos agendamento nem cobrança pelo chat.'},
 {audience:'all',q:'Esqueci a senha, como faço?',a:'Abra o aplicativo correspondente e use as opções oficiais de acesso ou recuperação de senha. Nunca informe sua senha aqui.'}
]);
export const UGO_KNOWLEDGE=`UGO atende inicialmente Florianópolis com Faxina e Marido de Aluguel. A disponibilidade real, as tarifas, as políticas de reembolso e o status de pedidos não são acessíveis neste atendimento público. Os formulários de Faxina pedem casa/apartamento/outro, ambientes, quartos, banheiros, 1–12 horas e necessidade de produtos; produtos com preço extra configurado pelo profissional dependem de aprovação do cliente. O profissional vê cadastro, ofertas e questões de GPS no aplicativo autenticado. Não solicitar senhas, documentos ou informações bancárias; não executar ações ou prometer preços.\nLinks oficiais de login: Cliente: ${UGO_LINKS.client} ; Profissional: ${UGO_LINKS.provider}.\nPerguntas frequentes e respostas verificadas:\n${UGO_FAQ.map(x=>`[${x.audience}] ${x.q} — ${x.a}`).join('\\n')}`;
export function routeAccessQuestion(message){
 const m=String(message||'').toLowerCase();
 const wantsAccess=/login|logar|loguear|iniciar sesi[oó]n|entrar|acessar|acceso|cadastro|registr|criar conta|contrase[nñ]a|senha|password|recuperar conta/.test(m);
 if(!wantsAccess)return null;
 const isPro=/profiss|proveed|prestador|worker|trabajad|oferecer servi|ofrecer servi/.test(m);
 const isClient=/cliente|client|contratar|pedir servi|solicitar servi/.test(m);
 const lang=/\b(login|senha|entrar|profissional|cadastro)\b/.test(m)?'pt':/\b(log in|sign in|provider)\b/.test(m)?'en':'es';
 if(isPro&&!isClient)return lang==='pt'? `Para entrar ou cadastrar-se como profissional, abra: ${UGO_LINKS.provider} . Não envie sua senha aqui.`:lang==='en'? `Sign in or register as a professional: ${UGO_LINKS.provider} . Never share your password here.`:`Para iniciar sesión o registrarte como profesional, entrá aquí: ${UGO_LINKS.provider} . No compartas tu contraseña en este chat.`;
 if(isClient&&!isPro)return lang==='pt'?`Para entrar como cliente, abra: ${UGO_LINKS.client} . Não envie sua senha aqui.`:lang==='en'?`Sign in or register as a customer: ${UGO_LINKS.client} . Never share your password here.`:`Para iniciar sesión o registrarte como cliente, entrá aquí: ${UGO_LINKS.client} . No compartas tu contraseña en este chat.`;
 return lang==='pt'?`Você pode acessar a UGO aqui: Cliente: ${UGO_LINKS.client} . Profissional: ${UGO_LINKS.provider} . Qual perfil você deseja usar?`:lang==='en'?`Choose your UGO access: Customer: ${UGO_LINKS.client} . Professional: ${UGO_LINKS.provider} .`:`Elegí cómo ingresar a UGO: Cliente: ${UGO_LINKS.client} . Profesional: ${UGO_LINKS.provider} .`;
}
