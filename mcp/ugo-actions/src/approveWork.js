import {
  UgoMcpError,
  requestHeaders,
} from "./currentJob.js";
import {
  authorizeActor,
  readOwnedService,
  validateServiceReadInput,
} from "./serviceReads.js";

export const APPROVE_WORK_VALIDATED_PROJECT_REFS = new Set([
  "tmossnqfwfwjrtzwcbmm",
]);

const ALLOWED_INPUT_KEYS = new Set([
  "userId",
  "role",
  "serviceId",
]);

export function validateApproveWorkInput(input = {}) {
  for (const key of Object.keys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) {
      throw new UgoMcpError(
        "invalid_input",
        `ugo_approve_work no acepta el campo ${key}`,
        400
      );
    }
  }

  const parsed = validateServiceReadInput(input);
  if (parsed.role !== "client") {
    throw new UgoMcpError(
      "invalid_input",
      "ugo_approve_work requiere role=client",
      400
    );
  }

  return parsed;
}

function hasWorkApproval(row) {
  const metadata = row?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  const approvedAt = metadata.trabajo_aprobado_at;
  return typeof approvedAt === "string" && approvedAt.trim().length > 0;
}

function approvalResult(parsed, state, {
  idempotent = false,
  reconciled = false,
  alreadyAdvanced = false,
  requiresCashConfirmation = false,
} = {}) {
  return {
    status: alreadyAdvanced ? "already_advanced" : "approved_work",
    service_id: parsed.serviceId,
    state,
    requires_cash_confirmation: Boolean(requiresCashConfirmation),
    idempotent: Boolean(idempotent),
    reconciled: Boolean(reconciled),
  };
}

async function readApprovalService(parsed, config, fetchImpl) {
  return await readOwnedService(
    parsed,
    config,
    fetchImpl,
    "id,cliente_id,estado,metadata,updated_at"
  );
}

function validateOwnedService(row, parsed) {
  if (!row) return null;

  if (row.id !== parsed.serviceId || row.cliente_id !== parsed.userId) {
    throw new UgoMcpError(
      "scope_mismatch",
      "El servicio recibido no coincide con el cliente/serviceId solicitado",
      502
    );
  }

  return row;
}

function reconcileApprovalState(row, parsed) {
  const service = validateOwnedService(row, parsed);
  if (!service) return null;

  const state = String(service.estado ?? "");

  if (state === "completado") {
    return approvalResult(parsed, state, {
      idempotent: true,
      reconciled: true,
    });
  }

  if (state === "esperando_aprobacion" && hasWorkApproval(service)) {
    return approvalResult(parsed, state, {
      idempotent: true,
      reconciled: true,
      requiresCashConfirmation: true,
    });
  }

  return null;
}

async function callApproveWorkRpc(parsed, config, fetchImpl) {
  let response;

  try {
    response = await fetchImpl(
      `${config.supabaseUrl}/rest/v1/rpc/aprobar_servicio`,
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

function normalizeApproveWorkRpcResponse(value, parsed) {
  const row = Array.isArray(value) ? value[0] ?? null : value;
  if (!row || typeof row !== "object") return null;

  if (row.id !== parsed.serviceId) {
    throw new UgoMcpError(
      "scope_mismatch",
      "El backend devolvió la aprobación para otro serviceId",
      502
    );
  }

  if (row.cliente_id !== parsed.userId) {
    throw new UgoMcpError(
      "scope_mismatch",
      "El backend devolvió la aprobación para otro cliente",
      502
    );
  }

  if (row.estado === "completado") {
    return approvalResult(parsed, "completado");
  }

  if (row.estado === "esperando_aprobacion" && hasWorkApproval(row)) {
    return approvalResult(parsed, "esperando_aprobacion", {
      requiresCashConfirmation: true,
    });
  }

  throw new UgoMcpError(
    "backend_invalid_response",
    "El backend no confirmó un resultado válido de aprobación",
    502
  );
}

export async function approveWork(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new UgoMcpError("runtime_error", "fetch no está disponible", 500);
  }

  const validated = validateApproveWorkInput(input);
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

  if (!APPROVE_WORK_VALIDATED_PROJECT_REFS.has(config.projectRef)) {
    throw new UgoMcpError(
      "backend_contract_not_ready",
      `ugo_approve_work está bloqueado para ${config.projectRef}: el hardening de cierre del cliente todavía no fue promovido y validado en ese backend`,
      409
    );
  }

  const current = validateOwnedService(
    await readApprovalService(parsed, config, fetchImpl),
    parsed
  );

  if (!current) {
    return {
      status: "rejected",
      code: "not_found_or_unauthorized",
      service_id: parsed.serviceId,
      state: null,
    };
  }

  const currentState = String(current.estado ?? "");

  if (currentState === "completado") {
    return approvalResult(parsed, currentState, {
      idempotent: true,
      alreadyAdvanced: true,
    });
  }

  if (currentState === "esperando_aprobacion" && hasWorkApproval(current)) {
    return approvalResult(parsed, currentState, {
      idempotent: true,
      requiresCashConfirmation: true,
    });
  }

  if (currentState !== "esperando_aprobacion") {
    return {
      status: "rejected",
      code: "invalid_state",
      service_id: parsed.serviceId,
      state: currentState || null,
    };
  }

  let response;

  try {
    response = await callApproveWorkRpc(parsed, config, fetchImpl);
  } catch (error) {
    try {
      const persisted = reconcileApprovalState(
        await readApprovalService(parsed, config, fetchImpl),
        parsed
      );
      if (persisted) return persisted;
    } catch {
      // Preserve the original mutation failure when recovery cannot be proven.
    }

    throw error;
  }

  const normalized = normalizeApproveWorkRpcResponse(response, parsed);
  if (normalized) return normalized;

  const persisted = reconcileApprovalState(
    await readApprovalService(parsed, config, fetchImpl),
    parsed
  );

  if (persisted) return persisted;

  throw new UgoMcpError(
    "backend_invalid_response",
    "El backend no confirmó la aprobación del trabajo",
    502
  );
}
