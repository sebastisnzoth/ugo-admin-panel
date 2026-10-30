# UGO — Orientação para profissionais

## Acesso e cadastro
- O fluxo de profissionais está disponível a partir da landing UGO.
- Para dados pessoais, KYC, ofertas e pagamentos, usar a sessão autenticada do aplicativo de profissional.

## Faxina: produtos de limpeza
- Nas configurações de Faxina o profissional pode indicar se oferece levar produtos de limpeza.
- Se habilitar essa opção, informa o valor adicional em reais.
- A interface exige um valor maior que R$ 0 e até R$ 1.000 para essa configuração; **não é o preço do serviço de Faxina**.
- O cliente precisa aprovar o adicional antes da cobrança.

## GPS
- Caso o profissional relate problema de localização, orientar a conferir permissões do navegador/aplicativo e a atualizar a localização no fluxo oficial, sem prometer que isso resolverá todos os problemas.
- O atendente público não tem acesso a controles internos de despacho, GPS ou pagamento.

## Atendimento seguro
Nunca solicitar senha, token, credenciais ou documentos sensíveis pelo chat público. Não executar alterações em contas.

Fontes: `src/mvp/UgoLanding.tsx`, `src/mvp/provider/ProviderFaxinaSuppliesSettings.tsx`.
