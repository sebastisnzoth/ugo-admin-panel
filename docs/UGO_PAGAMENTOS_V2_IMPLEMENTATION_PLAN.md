# UGO Pagamentos V2 — plan de implementación segura
Fecha: 2026-11-05. Estado: PLAN, sin habilitación de cobros reales.
Objetivo: Pix en BRL + split de comisión UGO + recepción del proveedor bajo Conta Escrow Asaas, con liberación controlada después de finalizar un servicio.
Restricciones: **no escribir en Arena PROD**, no aplicar migraciones PROD, no cambiar rutas de checkout actuales, no activar Asaas producción, no transferir dinero real, no editar configuración Vercel PROD. `ASAAS_SANDBOX_API_KEY` ya existe en entorno Vercel Production, pero su presencia **no autoriza a conectar el checkout productivo**. Mantenerla inactiva; entorno Sandbox fijado en código.

## Documentación de autoridad revisada
- Sandbox: https://docs.asaas.com/docs/sandbox
- Split: https://docs.asaas.com/docs/split-de-pagamentos
- Split + Escrow: https://docs.asaas.com/docs/split-para-contas-com-conta-escrow
- Configuración de subcuenta: https://docs.asaas.com/docs/habilitando-a-conta-escrow-para-as-subcontas
- Garantía consultable: https://docs.asaas.com/reference/recuperar-garantia-da-cobranca-na-conta-escrow
- Liberación irreversible: https://docs.asaas.com/reference/encerrar-garantia-da-cobranca-na-conta-escrow
- Webhooks: https://docs.asaas.com/docs/sobre-os-webhooks
- Costos Escrow: https://docs.asaas.com/docs/cobran%C3%A7a-da-taxa-por-subconta-configurada
- Checklist go-live: https://docs.asaas.com/docs/prepara%C3%A7%C3%A3o-para-produ%C3%A7%C3%A3o

## Hallazgos que condicionan el diseño
1. Split debe estar habilitado en la cuenta principal; confirmado por usuario en interfaz Sandbox, sin lectura API todavía.
2. Split porcentaje se calcula sobre `netValue`, no sobre bruto. El sobrante neto permanece en cuenta creadora; no pasar su walletId como destinataria.
3. `PAYMENT_SPLIT_DONE` demuestra liquidación de cada Split, **no disponibilidad** cuando la subcuenta usa Escrow.
4. Configurar Escrow antes de recibir los pagos. `daysToExpire` causa liberación automática, incluso con disputa pendiente en UGO. Deshabilitar Escrow libera todas las garantías; acción prohibida en operaciones ordinarias.
5. Escrow cobra mensualidad por subcuenta habilitada, incluso si no hay pagos. Confirmar importe real antes de activar (evitar activación global).
6. GET `/v3/payments/{paymentId}/escrow` requiere API Key de **la subcuenta asociada** a la cobranza. No asumir que la key principal puede leer todas las garantías. Estudiar cómo manejar claves segregadas y el contexto de subcuenta.
7. POST `/v3/escrow/{escrowId}/finish` exige `ESCROW:WRITE` y es irreversible. `escrowId` no es `paymentId`. Nunca repetir a ciegas tras timeout.
8. Asaas webhook envía `asaas-access-token`, separado de API key. Persistir eventos por id y responder 200 después de persistencia; manejar reintentos, cola interrumpida y conciliación.
9. Sandbox no equivale a validación productiva ni garantiza las mismas tarifas/funciones.

## Etapas y puertas de salida
### Fase 0 — Inventario, aislamiento y costos (sin mutaciones)
- Inventariar interfaces existentes: `api/pagos/crear.ts`, `src/server/payments/*`, `src/mvp/ProviderPayoutPanel.tsx`, `api/retiros/solicitar.ts`, webhooks y RPCs actuales.
- Confirmar Vercel con solo nombres y scopes de variables, jamás leer ni emitir secretos. Prohibido reutilizar la key Sandbox desde endpoints productivos.
- Verificar API Asaas Sandbox **solo lectura** con ejecución server-side aislada autorizada. Consultar cuenta, wallets, capacidad/configuración Escrow, permisos y tasas. Si no hay endpoint/credencial de subcuenta, marcar bloqueado y no inferir.
- Confirmar importe mensual por subcuenta y modelo de responsabilidad fiscal/CPF-CNPJ.
**Salida:** matriz de capacidades, tarifas y límites aprobada; ninguna cuenta Escrow activada.

### Fase 1 — Diseño de contratos y ledger TEST aislado
- Definir entidades: provider_payment_accounts, payment_intents, payment_attempts, payment_splits, escrow_guarantees, payment_events (unique provider_event_id), release_requests, ledger_entries (double entry), reconciliation_runs y disputes.
- Usar enteros centavos, versiones y estados separados: payment pending/confirmed; split pending/settled; guarantee active/released/expired; provider balance unavailable/available; payout requested/paid.
- Definir RLS para cliente, proveedor y admin. RPC atómica con lock de garantía y unique release key; nunca usar metadata editable por el cliente para permisos.
- Nuevas migraciones solamente contra DB TEST nueva y aislada, sin PROD.
**Salida:** pruebas DB de aislamiento, contabilidad, RLS y concurrencia reales pasan.

### Fase 2 — Adaptação Asaas Sandbox (sin frontend activo)
- Gateway AsaasSandbox fijado a `https://api-sandbox.asaas.com/v3` y `ASAAS_SANDBOX_API_KEY`, sin URL arbitraria.
- Verificar credenciales segregadas por subcuenta (cifrado en repositorio de secretos backend) y mínimo permiso posible.
- Crear solo subcuentas, customer y cobranzas SINTÉTICAS de pruebas aisladas tras revisión de costos; no habilitar por defecto Escrow global en todas las subcuentas.
- Probar `POST /payments` con `billingType: PIX` + `split` con walletId de proveedor y cuenta principal reteniendo remanente neto. Validar walletId contra beneficiario registrado en servidor.
- Probar receipt, split event por splitId, consulta de escrow con key de la subcuenta, expiración y reintegros.
**Salida:** pruebas end-to-end exclusivamente Sandbox con saldo ficticio; conciliación exacta net/fee/UGO/proveedor.

### Fase 3 — Webhooks + reconciliación
- Webhook aislado `/api/pagamentos-v2/asaas/webhook`, token dedicado, comparaciones seguras, idempotencia por event.id, almacenamiento durable antes de 200, job posterior de procesamiento.
- Actualizar estado únicamente tras lectura autenticada al procesador. No inferir Escrow desde `PAYMENT_SPLIT_DONE`.
- Conciliador puntual/limitado para garantías, diferencias de split y expiración automática; alertar sobre webhook fallido o cola pausada.
**Salida:** replays, eventos duplicados/fuera de orden, cortes de red y reanudación sin doble crédito.

### Fase 4 — Liberação após serviço
- Estado de servicio exacto desde schema de UGO; exigir comprobantes de conclusión y ventana de disputa definida.
- Autorizar liberación solo rol admin autorizado + pago confirmado + split de proveedor confirmado + garantía activa verificada + sin disputa/reembolso.
- Confirmación humana o política aprobada, lock transaccional y clave única de solicitud. Ejecutar `POST /escrow/{escrowId}/finish` desde backend de subcuenta con `ESCROW:WRITE`.
- Ante timeout, primero consultar garantía; nunca repetir finish sin reconciliación.
- Registrar liberación solicitada/efectiva por separado. Vigilar expiración automática y ofrecer ruta de contingencia para disputas.
**Salida:** dos administradores/conexiones simultáneas no producen doble liberación; ningún botón cliente/proveedor llama finish.

### Fase 5 — UX y operación
- Cliente: QR, copia/cola, estado pago confirmado y aviso de protección hasta plazo límite.
- Proveedor: valores liquidados/en garantía/disponibles y vencimiento; no confundir `retenido` en DB con garantía real.
- Super Admin: monitor de cobranzas, splits, garantías, comisiones, disputas, anomalías y auditoría; kill switch solo V2.
- Registrar costos por proveedor y porcentaje comisión neta configurable.
**Salida:** revisión UX + contabilidad + permisos con usuarios sintéticos.

### Fase 6 — Go/no-go controlado
- Pruebas E2E 2 proveedores, pago con misma tarifa, webhook replay, refund parcial y total, expiración, falla de KYC, comisión y fees, timeout al liberar, deduplicación, saldo insuficiente y recuperación de fallas.
- Validación técnica/fiscal, revisión de términos, autorización expresa para activar credenciales productivas y despliegue separado. Plan de rollback deja cobros existentes intactos, sin cambiar garantía ya activa.
- **No hacer merge/activar sin gates de CI y evidencia de pruebas reales Sandbox**.

## Riesgos críticos
- Garantía automática vence incluso con disputa; nunca prometer custodia indefinida.
- Tarifa mensual por subcuenta puede romper presupuesto US$0.
- Asaas keys por subcuenta y permisos deben diseñarse antes del flujo de liberación.
- `retenido` del sistema UGO actual no equivale a custodia contractual.
- Nunca ejecutar pruebas contra Arena PROD; usar mocks offline, luego entorno de DB TEST separado.
- Las modificaciones de endpoint en Vercel Production pueden ser alcanzables por clientes aunque credencial sea Sandbox; aislar por dominio/proyecto antes de conectarlo.

## Estado actual
- PR #616 (borrador): reglas puras y conector sandbox desacoplado, pruebas unitarias. No está listo para merge.
- Split habilitado por el usuario en Asaas Sandbox.
- `ASAAS_SANDBOX_API_KEY` guardada en Vercel `ugo-admin-panel` bajo target Production; no cambiaremos su scope sin autorización.
- No se ha realizado llamada autenticada a Asaas ni probado una garantía/subcuenta real.

## 2026-11-06 · Asaas: cadastro de clientes (documentación aportada)
- Antes de `POST /v3/payments`, el pagador debe tener un `customer` Asaas creado mediante `POST /v3/customers`; reutilizar `cus_...` en siguientes cobranzas.
- Guardar vínculo `ugo_client_id -> asaas_customer_id` único por ambiente, con `externalReference` interno; no crear un cliente Asaas por cada QR ni aceptar un `customerId` arbitrario del proveedor.
- Campos documentados: `name`, `cpfCnpj`, `email`, `mobilePhone`, `externalReference`, `notificationDisabled`; validar datos y políticas de privacidad. El módulo de contrato valida formato, pero la verificación real de CPF/CNPJ y documentos queda pendiente.
- En caso de timeout o error inconcluso, consultar el cadastro y reconciliar antes de reintentar; Asaas permite duplicar clientes. Se requiere índice UNIQUE y bloqueo por cliente en TEST.
- Se añadió `src/server/payments/asaasCustomerSandbox.mjs` y pruebas offline; aún no enlazados al checkout.
- Fuente: documento de Asaas `Cadastro de clientes` entregado por el usuario, actualizado 2026-08-04.

## 2026-11-06 — Wallet principal e roteamento Pix
- Usuário informou um walletId que se acredita ser da conta UGO. **Não foi verificado** se é Sandbox ou Production; nunca fixar este identificador no código ou em fixtures públicas.
- Para verificar a titularidade do emissor: `GET /v3/wallets/` com a chave Sandbox autenticada, executado exclusivamente no servidor. Comparar a resposta com o ID informado, sem imprimir credenciais.
- Na emissão de `POST /payments` com Split, `validateWalletRouting` agora exige carteira emissora verificada e carteira do prestador vinculada a subconta do mesmo ambiente e prestador designado. Não enviar walletId de UGO no array `split`.
- O guard é defesa em profundidade **não substitui** sessão verificada, DB TEST, locks UNIQUE, verificação de conta, nem prova de split/custódia; não ativar checkout enquanto faltarem esses controles.
- Documentação oficial: https://docs.asaas.com/reference/recuperar-walletid e https://docs.asaas.com/docs/split-de-pagamentos

## 2026-11-06 · Recuperación de clientes Asaas ante timeout
- Se añadió al adapter de Sandbox `findCustomerByReference(externalReference)`, `GET /v3/customers?externalReference=...&limit=100`, sin cuerpo y sin crear recursos.
- Es una función de conciliación, no de alta automática: si hay duplicados, paginación `hasMore`, falta de identificador o referencia distinta, falla de forma segura.
- Aún hay que vincular de forma transaccional `UGO client -> cus_...` mediante índice único en una base TEST aislada; el adaptador por sí solo no evita carreras simultáneas.
- Fuente: https://docs.asaas.com/reference/listar-clientes y guía `Cadastro de clientes` entregada por usuario.


## Handoff 2026-11-06 — P0 de integración
- Baseline PR #616 `f34cbffd61312ade75ee1f9c188768b83273f3b4`: Core CI, seguridad, roadmap y Hugo runtime verdes.
- Implementado flujo fixture-only Neon TEST y corrección de `externalReference` canónica para creación/consulta/reintento. Agregada recepción webhook durable + deduplicación aislada sin acreditación.
- Para habilitar primer Pix real aún faltan: servidor TEST separado con credencial Asaas Sandbox obtenida mediante canal seguro, wallet principal y destinataria verificadas, customer de prueba, endpoint webhook TEST autenticado y conciliación de Split (sin Escrow automático).
- Nunca usar automáticamente la variable `ASAAS_SANDBOX_API_KEY` con target Vercel Production para crear un cobro. Cualquier acción que requiera mover/copiar secretos, habilitar subcontas cobrables o desplegar endpoint público necesita autorización y controles específicos.


## Handoff 2026-11-06 — Persistência de dados verificados e worker transacional
- `recordProcessorCharge` exige o pagador Asaas e o wallet recebedor originais validados por relação SQL da base TEST; grava ambos na intenção de pagamento, impedindo mudança posterior do destinatário.
- `asaasSandboxPaymentEventWorker.mjs` recupera o evento já autenticado e persistido, busca cobrança fresca pela API Sandbox autenticada, valida id, customer, externalReference, valor bruto e líquido e atualiza em uma transação PostgreSQL (estado e marcador de processamento). Rejeita duplicações, mudanças de metadados, regressões de estado e wallet receptor ausente. **Não credita ledger nem libera fundos**.
- Webhook IDs Asaas podem conter `&` conforme documentação oficial; worker aceita o formato igual ao parser de entrada, mantendo controle de caracteres e consultas parametrizadas.
- Eventos `PAYMENT_SPLIT_*` permanecem fora do reconciliador comum. Exigem método de liquidação independente que valide `additionalInfo.splitId` e o registro de Split esperado antes de atualizar `payment_splits`.
- Novos testes PGlite cobrem estados recebidos/confirmados, dados falsificados, wallet ausente, eventos desconhecidos, replay, evento contendo `&` e impossibilidade de dar Split como concluído apenas com webhook de pagamento.
- **Ainda não homologado com API real**: segredo Asaas Sandbox fora de Production, wallet UGO, wallet do prestador e backend TEST com credenciais isoladas. Não habilitar endpoint nem fazer merge do PR até E2E Sandbox efetivo e CI SAME-SHA.


## 2026-11-06 — Split 85/15 sem liberação implícita
- Fonte Asaas: https://docs.asaas.com/reference/recuperar-um-unico-split-pago e https://docs.asaas.com/docs/split-de-pagamentos
- GET `/v3/payments/splits/paid/{id}` disponível no cliente de teste e função de validação conservadora `verifyAuthenticatedPaidSplit`. Exige identidade, wallet original e pagamento persistidos, percentual 85, estado DONE e quantia correspondente ao netValue. Valores divergentes exigem revisão manual, não lançamento em saldo.
- Split DONE **não equivale** a dinheiro disponível quando Escrow está em uso. Não liberar garantias. Módulo de validação separado ainda não executa conciliação durável em Neon nem altera o ledger.


## 2026-11-06 — Backend de auditoria TEST Vercel efetivo
- Projeto independente: `ugo-pagamentos-v2-sandbox` / Vercel `prj_1EzMjxgYVtk4Ro0IFil3w2cTAE7N`. Preview `dpl_BNuF8WMXRipHSC43Exd37EU9Xbf4` (São Paulo, `gru1`). Deploy inicial classificado Production está fail-closed por guard `VERCEL_ENV==='preview'`; nunca usar deploy PROD do próprio projeto.
- Código em `payments-sandbox/api/{health,wallets}.js`: somente probes GET; Vercel test env inclui conexão Neon PostgreSQL read-only cifrada, token operador cifrado, identificador informado da wallet UGO (não verificado). GET health real retornou HTTP 200 e role read-only.
- **Bloqueio externo efetivo:** configurar pelo próprio Vercel TEST, somente target Preview, a chave da conta UGO Sandbox (`ASAAS_SANDBOX_API_KEY`), a chave da conta Asaas Sandbox do provedor (`ASAAS_PROVIDER_SANDBOX_API_KEY`) e o walletId do recebedor (`UGO_ASAAS_PROVIDER_WALLET_ID`). Não enviar chaves no chat, frontend ou GitHub e não copiar do Vercel de Arena PROD. Após isso, executar verificação de carteira com operador, rever condições de habilitação do Split e só depois montar backend WRITE isolado com idempotência/escrow.
- Nenhuma conexão de produção reutilizada. Nenhum pagamento Pix real ou confirmação Sandbox executada nesta fase.


## 2026-11-06 — Wallet emissora UGO autenticada no Asaas Sandbox
- Projeto TEST `ugo-pagamentos-v2-sandbox`, variável `ASAAS_SANDBOX_API_KEY` configurada como Sensitive somente Preview e não exposta.
- Verificação direta do backend Preview mediante **GET autenticado Asaas Sandbox `/v3/wallets/`** retornou HTTP 200, lista com exatamente uma carteira e `verified:true, ambiguous:false` quando comparada com a wallet esperada `c4125b7d-fb92-4232-923a-01ab389a84f7`.
- Foi identificado bug de formato: API Asaas retorna `data: [{object:'wallet',id:'...'}]` e o verificador antigo exigia `walletId`. Corrigido no adapter e na rota privada de Preview, com testes de contrato para resposta real, outras carteiras e identificadores conflitantes.
- Verificação temporária `api/issuer-audit.js` foi incluída **somente em deploys transitórios** para diagnóstico de schema, sem chaves, wallet IDs ou pagamentos na resposta. **Não faz parte do repo** e não deve ser promovida; deploy Preview regular deve conter somente health e wallet autenticada com token de operador.
- Wallet de prestador separada ainda **não verificada**: depende de chave da conta Sandbox prestadora e wallet vinculada verificada. Nenhum Pix, confirmação, Split ou Escrow executado.
