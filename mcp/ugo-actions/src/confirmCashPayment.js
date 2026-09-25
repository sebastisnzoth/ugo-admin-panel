import {
  UgoMcpError,
  fetchJson,
  requestHeaders,
} from "./currentJob.js";
import {
  authorizeActor,
  readOwnedService,
  validateServiceReadInput,
} from "./serviceReads.js";

export const CONFIRM_CASH_PAYMENT_VALIDATED_PROJECT_REFS = new Set([
  "tmossnqfwfwjrtzwcbmm",
]);

const ALLOWED_INPUT_KEYS = new Set([
  "userId",
  "role",
  "serviceId",
]);

export function validateConfirmCashPaymentInput(input = {}) {
  for (const key of Object.keys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) {
      throw new UgoMcpError(
        "invalid_input",
        `ugo_confirm_cash_payment no acepta el campo ${key}`,
        400
      );
    }
  }

  const parsed = validateServiceReadInput(input);
  if (parsed.role !== "client") {
    throw new UgoMcpError(
      "invalid_input",
      "ugo_confirm_cash_payment requiere role=client",
      400
    );
  }

  return parsed;
}

function hasWorkApproval(service) {
  const metadata = service?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  const approvedAt = metadata.trabajo_aprobado_at;
  return typeof approvedAt === "string" && approvedAt.trim().length > 0;
}

function isCanonicalCashPayment(payment) {
  return Boolean(
    payment &&
      payment.metodo === "efectivo" &&
      payment.procesador === "efectivo" &&
      payment.modelo_pago === "presencial"
  );
}

function cashResult(parsed, {
  idempotent = false,
  reconciled = false,
} = {}) {
  return {
    status: "confirmed_cash_payment",
    service_id: parsed.serviceId,
    state: "completado",
    payment_state: "liberado",
    idempotent: Boolean(idempotent),
    reconciled: Boolean(reconciled),
  };
}

async function readCashService(parsed, config, fetchImpl) {
  return await readOwnedService(
    parsed,
    config,
    fetchImpl,
    "id,cliente_id,estado,metadata,ambiente,updated_at"
  );
}

async function readLatestCashCandidate(parsed, config, fetchImpl) {
  const params = new URLSearchParams({
    select: "id,servicio_id,metodo,procesador,modelo_pago,estado,ambiente,updated_at",
    servicio_id: `eq.${parsed.serviceId}`,
    order: "created_at.desc",
    limit: "1",
  });

  const rows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/pagos?${params.toString()}`,
    config
  );

  return Array.isArray(rows) ? rows[0] ?? null : null;
}

function validateOwnedService(service, parsed) {
  if (!service) return null;

  if (service.id !== parsed.serviceId || service.cliente_id !== parsed.userId) {
    throw new UgoMcpError(
      "scope_mismatch",
      "El servicio recibido no coincide con el cliente/serviceId solicitado",
      502
    );
  }

  return service;
}

function validatePaymentScope(payment, service, parsed) {
  if (!payment) return null;

  if (payment.servicio_id !== parsed.serviceId) {
    throw new UgoMcpError(
      "scope_mismatch",
      "El pago recibido no pertenece al serviceId solicitado",
      502
    );
  }

  if (
    service?.ambiente &&
    payment.ambiente &&
    payment.ambiente !== service.ambiente
  ) {
    throw new UgoMcpError(
      "scope_mismatch",
      "El pago recibido no pertenece al ambiente del servicio",
      502
    );
  }

  return payment;
}

async function readCashContext(parsed, config, fetchImpl) {
  const service = validateOwnedService(
    await readCashService(parsed, config, fetchImpl),
    parsed
  );

  if (!service) {
    return { service: null, payment: null };
  }

  const payment = validatePaymentScope(
    await readLatestCashCandidate(parsed, config, fetchImpl),
    service,
    parsed
  );

  return { service, payment };
}

function closurePersisted(context) {
  return Boolean(
    context?.service?.estado === "completado" &&
      isCanonicalCashPayment(context?.payment) &&
      context.payment.estado === "liberado"
  );
}

async function callConfirmCashRpc(parsed, config, fetchImpl) {
  let response;

  try {
    response = await fetchImpl(
      `${config.supabaseUrl}/rest/v1/rpc/confirmar_pago_efectivo_cliente`,
      {
        method: "POST",
        headers: {
          ...requestHeaders(config),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          p_servicio_id: parsed.serviceId,
        }),
      }
    );
  } catch {
    throw new UgoMcpError(
      "backend_unavailable",
      "No se pudo contactar Supabase",
      503
    );
  }

  let body = null;

  try {
    body = await response.json();
  } catch {
    if (!response?.ok) {
      throw new UgoMcpError(
        "backend_error",
        `Supabase respondió HTTP ${Number(response?.status) || 502}`,
        Number(response?.status) || 502
      );
    }

    throw new UgoMcpError(
      "backend_invalid_response",
      "Supabase devolvió una respuesta inválida",
      502
    );
  }

  if (!response?.ok) {
    const status = Number(response.status) || 502;
    const backendMessage =
      typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : `Supabase respondió HTTP ${status}`;

    throw new UgoMcpError(
      status === 401 || status === 403
        ? "authentication_failed"
        : "backend_rejected",
      backendMessage,
      status
    );
  }

  return body;
}

function validateCashRpcResponse(value, parsed) {
  const row = Array.isArray(value) ? value[0] ?? null : value;
  if (!row || typeof row !== "object") return null;

  if (row.id !== parsed.serviceId) {
    throw new UgoMcpError(
      "scope_mismatch",
      "El backend devolvió el cierre cash para otro serviceId",
      502
    );
  }

  if (row.cliente_id !== parsed.userId) {
    throw new UgoMcpError(
      "scope_mismatch",
      "El backend devolvió el cierre cash para otro cliente",
      502
    );
  }

  if (row.estado !== "completado") {
    throw new UgoMcpError(
      "backend_invalid_response",
      "El backend no confirmó el servicio completado",
      502
    );
  }

  return row;
}

export async function confirmCashPayment(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new UgoMcpError("runtime_error", "fetch no está disponible", 500);
  }

  const validated = validateConfirmCashPaymentInput(input);
  const { parsed, config, denied } = await authorizeActor(validated, {
    env,
    fetchImpl,
  });

  if (denied) {
    return {
      status: "rejected",
      code: "unauthorized",
      service_id: parsed.serviceId,
      state: null,
    };
  }

  if (!CONFIRM_CASH_PAYMENT_VALIDATED_PROJECT_REFS.has(config.projectRef)) {
    throw new UgoMcpError(
      "backend_contract_not_ready",
      `ugo_confirm_cash_payment está bloqueado para ${config.projectRef}: el hardening de cierre cash/deuda todavía no fue promovido y validado en ese backend`,
      409
    );
  }

  const current = await readCashContext(parsed, config, fetchImpl);

  if (!current.service) {
    return {
      status: "rejected",
      code: "not_found_or_unauthorized",
      service_id: parsed.serviceId,
      state: null,
    };
  }

  if (closurePersisted(current)) {
    return cashResult(parsed, { idempotent: true });
  }

  const currentState = String(current.service.estado ?? "");

  if (currentState !== "esperando_aprobacion") {
    return {
      status: "rejected",
      code: "invalid_state",
      service_id: parsed.serviceId,
      state: currentState || null,
    };
  }

  if (!hasWorkApproval(current.service)) {
    return {
      status: "rejected",
      code: "work_not_approved",
      service_id: parsed.serviceId,
      state: currentState,
    };
  }

  if (current.payment && !isCanonicalCashPayment(current.payment)) {
    return {
      status: "rejected",
      code: "not_cash_payment",
      service_id: parsed.serviceId,
      state: currentState,
    };
  }

  if (
    current.payment &&
    !["pendiente", "liberado"].includes(String(current.payment.estado ?? ""))
  ) {
    return {
      status: "rejected",
      code: "invalid_payment_state",
      service_id: parsed.serviceId,
      state: currentState,
    };
  }

  let response;

  try {
    response = await callConfirmCashRpc(parsed, config, fetchImpl);
  } catch (error) {
    try {
      const persisted = await readCashContext(parsed, config, fetchImpl);
      if (closurePersisted(persisted)) {
        return cashResult(parsed, {
          idempotent: true,
          reconciled: true,
        });
      }
    } catch {
      // Preserve the original mutation failure when recovery cannot be proven.
    }

    throw error;
  }

  validateCashRpcResponse(response, parsed);

  const persisted = await readCashContext(parsed, config, fetchImpl);
  if (closurePersisted(persisted)) {
    return cashResult(parsed);
  }

  throw new UgoMcpError(
    "backend_invalid_response",
    "El backend no confirmó servicio completado + pago cash liberado",
    502
  );
}
