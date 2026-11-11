# UGO PIX pós-serviço — auditoria Cliente ↔ Provedor (2026-11-10)

## Regra de produto validada pelo operador

Escolha de **Pix** pelo cliente é uma **preferência**, não pagamento antecipado.
O profissional deve poder aceitar, se deslocar, chegar e executar o serviço
conforme as regras existentes de GPS, preço aprovado e evidências. Após
concluir o trabalho e apresentar evidências finais, o profissional exibe na
**sua própria tela** o QR Pix oficial da cobrança daquele serviço. O cliente
escaneia com seu banco; como alternativa, usa copia-e-cola no próprio aparelho.
Somente o backend, depois de consultar Asaas, marca `received`. A comissão e
o repasse ao provedor têm verificações financeiras separadas.

## Bugs/restrições encontrados em main

1. **Criação Pix antecipada (P0)**: `src/features/client/payments/ClientPaymentChoice.tsx`,
   `choosePix()`, faz POST `/api/pagos/crear` logo após escolher Pix, quando
   a tarifa existe. É incompatível com pagar após serviço.
2. **Bloqueio no provedor (P0)**: `src/mvp/provider/providerData.tsx`
   verifica `funded` para Pix e impede `llegado → en_progreso`.
   A primeira transição `asignado → en_camino` também exige `funded`,
   `cashSelected` ou `paymentPreferenceSelected`, sendo esta última
   calculada apenas quando a tarifa não está pronta.
3. **Bloqueio no PostgreSQL (P0)**:
   `supabase/migrations/20260930190000_variable_price_lifecycle_payment_gate.sql`
   exige pagamento pronto antes de deslocar em preço fixo e começar em
   preço conhecido. Alterar apenas React não resolve e pode deixar as duas
   telas em estados contraditórios.
4. **Estados de pagamento concorrentes (P0)**:
   `api/pagos/crear.ts` e `src/features/client/payments/ClientPaymentChoice.tsx`
   usam seleção de `pagos` que deve ser revisada contra várias tentativas;
   `api/pagos/crear.ts` usa `limit(1).maybeSingle()` sem ordem explícita.
   Um pagamento antigo pode ser confundido com o atual. Não mudar o caminho
   PROD sem revisar contratos e lock transacional.
5. **Serviço finalizado vs pagamento recebido (P0)**: o provedor atual
   utiliza `en_progreso → esperando_aprobacion`; o fechamento do serviço,
   aprovação, pagamento e repasse não podem compartilhar um único booleano.
6. **Duas bases de dados isoladas (P0)**: Arena e Neon TEST
   não podem compartilhar token privilegiado, nem ser acopladas por um
   endpoint público de operador. O `/api/pix` da Preview hoje usa uma única
   fixture de R$ 100, autenticação de operador e NÃO é API de usuário final.
7. **Webhook incompleto (P0)**: `payments-sandbox/api/webhook.js`
   valida/guarda eventos, mas não executa ainda o worker; `PAYMENT_RECEIVED`
   precisa ser confirmado por GET autenticado e refletido nas telas.
8. **Custódia e split (P1)**: Asaas marcou pagamento teste
   `pay_jmo6xa5x1sfkpn5i` como `RECEIVED`, líquido R$ 99,01,
   mas isso NÃO comprova split 85/15, custódia, escrow ou repasse.

## Contrato seguro proposto

1. Cliente seleciona `payment_method=pix` na criação e recebe estado
   `pix_selected_deferred`, sem cobrar e sem mostrar status `paid`.
2. Backend verifica preferência persistida + preço aprovado e habilita
   deslocamento e início do trabalho **sem cobrar previamente** somente
   para serviços explicitamente habilitados no piloto. Não alterar
   geofence, fotos, agendamento, autenticação ou RLS.
3. Provedor finaliza execução e envia evidência final. O serviço entra em
   `esperando_aprobacion` / `awaiting_payment` conforme regra comercial
   claramente definida. Uma transação vincula `service_id`, cliente,
   provedor, preço final em centavos e referência única.
4. Backend cria uma única cobrança Asaas Sandbox com `billingType:PIX`.
   Retries usam a mesma reserva e só recuperam QR existente. Resultado
   incerto leva a reconciliação, nunca a novo POST cego.
5. Somente profissional autenticado e atribuído recebe a imagem QR no app.
   Cliente lê o QR por banco ou copia código, sem exigir segundo login.
6. Enquanto pendente, ambos veem `Aguardando pagamento`; botão
   `Atualizar status` faz consulta autorizada, não confirmação manual.
7. `PAYMENT_RECEIVED` assinado/validado, inserido idempotentemente, é
   processado com leitura Asaas + verificações de identidade e valor
   antes de marcar pago no banco; telas Cliente/Provedor sincronizam.
8. Após recebido, QR desaparece, recibo fica disponível e o status de
   pagamento é distinto de status do serviço e status de repasse.
   Disputas, reembolsos, cancelamentos e QR expirado entram em revisão
   quando necessário.

## Regressões a bloquear em testes E2E

- Cliente escolhe Pix na pré-reserva, é atribuído e provedor consegue
  `asignado → en_camino → llegado → en_progreso` em TEST sem cobrança.
- Troca de método apenas antes do trabalho, sem preferências divergentes.
- Mesmo serviço, duas chamadas concorrentes: um `paymentId`, um QR.
- Duas sessões do provedor e restauração após offline: sem cobrança nova.
- Falha de token/sessão: preservar o trabalho e não marcar como pago.
- QR expirado/cancelado/recebido: nunca é exibido como pagável.
- Webhook duplicado, fora de ordem, perdido ou atrasado: no máximo uma
  transição financeira válida, com GET para reconciliação.
- Valor final aprovado corresponde exatamente ao valor Asaas e
  não pode mudar após criar QR sem invalidar tentativa.
- Pix vs dinheiro: caminhos isolados e sem conversão silenciosa.
- Sem cobrança/repasse real, sem escrita em Supabase PROD e sem secrets
  vazados para browser, logs ou GitHub.

## Estado da implementação neste branch

- `VITE_FLAG_PIX_PAY_AFTER_SERVICE_PREVIEW`: desativada por padrão,
  impossível ativar em build PROD; quando habilitada em Preview, o cliente
  **apenas salva a escolha**, sem POST antecipado.
- `ProviderPixAfterService.tsx`: componente visual não montado no app real.
- `/api/pix` `get_qr`: operador autenticado para única cobrança TEST já
  vinculada e ainda pendente, sem criar duplicados.
- `/api/webhook`: inbox idempotente Preview; processador e tela sincronizada
  ainda não conectados.
- **NÃO ativar o novo flag ainda**: faltam backend de usuário real/serviço,
  autorização, migração isolada da regra de transição, integração E2E e CI.
- Não publicar em main/PROD antes de prova integrada Cliente+Provedor
  com pagamento ao final e rollback documentado.
