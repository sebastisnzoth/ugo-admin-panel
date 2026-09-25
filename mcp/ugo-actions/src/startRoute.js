import {
  UgoMcpError,
  requestHeaders,
} from "./currentJob.js";
import {
  authorizeActor,
  readOwnedService,
  validateServiceReadInput,
} from "./serviceReads.js";

export const START_ROUTE_VALIDATED_PROJECT_REFS = new Set([
  "tmossnqfwfwjrtzwcbmm",
]);

const ROUTE_STARTED_OR_LATER = new Set([
  "en_camino",
  "llegado",
  "en_progreso",
  "esperando_aprobacion",
  "completado",
]);

const ROUTE_TERMINAL_REJECTED = new Set([
  "cancelado",
  "disputado",
]);

export function validateStartRouteInput(input = {}) {
  const parsed = validateServiceReadInput(input);
  if (parsed.role !== "provider") {
    throw new UgoMcpError(
      "invalid_input",
      "ugo_start_route requiere role=provider",
      400
    );
  }
  return parsed;
}

function routeResult(parsed, state, {
  idempotent = false,
  reconciled = false,
  alreadyAdvanced = false,
} = {}) {
  return {
    status: alreadyAdvanced ? "already_advanced" : "started_route",
    service_id: parsed.serviceId,
    state,
    idempotent: Boolean(idempotent),
    reconciled: Boolean(reconciled),
  };
}

async function readRouteService(parsed, config, fetchImpl) {
  return await readOwnedService(
    parsed,
    config,
    fetchImpl,
    "id,proveedor_id,estado,updated_at"
  );
}

function validateOwnedService(row, parsed) {
  if (!row) return null;
  if (row.id !== parsed.serviceId || row.proveedor_id !== parsed.userId) {
    throw new UgoMcpError(
      "route_scope_mismatch",
      "El servicio recibido no coincide con el proveedor/serviceId solicitado",
      502
    );
  }
  return row;
}

function reconcileRouteState(row, parsed) {
  const service = validateOwnedService(row, parsed);
  if (!service) return null;
  const state = String(service.estado ?? "");
  if (state === "en_camino") {
    return routeResult(parsed, state, { idempotent: true, reconciled: true });
  }
  if (ROUTE_STARTED_OR_LATER.has(state)) {
    return routeResult(parsed, state, {
      idempotent: true,
      reconciled: true,
      alreadyAdvanced: true,
    });
  }
  return null;
}

async function callStartRouteRpc(parsed, config, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(
      `${config.supabaseUrl}/rest/v1/rpc/avanzar_servicio`,
      {
        method: "POST",
        headers: {
          ...requestHeaders(config),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          p_servicio_id: parsed.serviceId,
          p_estado: "en_camino",
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
      status === 401 || status === 403 ? "authentication_failed" : "backend_rejected",
      backendMessage,
      status
    );
  }

  return body;
}

function normalizeRouteRpcResponse(value, parsed) {
  const row = Array.isArray(value) ? value[0] ?? null : value;
  if (!row || typeof row !== "object") return null;

  if (row.id !== parsed.serviceId) {
    throw new UgoMcpError(
      "route_scope_mismatch",
      "El backend devolvió la transición para otro serviceId",
      502
    );
  }
  if (row.proveedor_id !== parsed.userId) {
    throw new UgoMcpError(
      "route_scope_mismatch",
      "El backend devolvió la transición para otro proveedor",
      502
    );
  }
  if (row.estado !== "en_camino") {
    throw new UgoMcpError(
      "backend_invalid_response",
      "El backend no confirmó el estado en_camino",
      502
    );
  }

  return routeResult(parsed, "en_camino");
}

export async function startRoute(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new UgoMcpError("runtime_error", "fetch no está disponible", 500);
  }

  const validated = validateStartRouteInput(input);
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

  if (!START_ROUTE_VALIDATED_PROJECT_REFS.has(config.projectRef)) {
    throw new UgoMcpError(
      "backend_contract_not_ready",
      `ugo_start_route está bloqueado para ${config.projectRef}: el contrato P0 de programación/GPS/deuda todavía no fue promovido y validado en ese backend`,
      409
    );
  }

  const current = validateOwnedService(
    await readRouteService(parsed, config, fetchImpl),
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
  if (currentState === "en_camino") {
    return routeResult(parsed, currentState, { idempotent: true });
  }
  if (ROUTE_STARTED_OR_LATER.has(currentState)) {
    return routeResult(parsed, currentState, {
      idempotent: true,
      alreadyAdvanced: true,
    });
  }
  if (ROUTE_TERMINAL_REJECTED.has(currentState) || currentState !== "asignado") {
    return {
      status: "rejected",
      code: "invalid_state",
      service_id: parsed.serviceId,
      state: currentState || null,
    };
  }

  let response;
  try {
    response = await callStartRouteRpc(parsed, config, fetchImpl);
  } catch (error) {
    try {
      const persisted = reconcileRouteState(
        await readRouteService(parsed, config, fetchImpl),
        parsed
      );
      if (persisted) return persisted;
    } catch {
      // Preserve the original mutation failure when recovery cannot be proven.
    }
    throw error;
  }

  const normalized = normalizeRouteRpcResponse(response, parsed);
  if (normalized) return normalized;

  const persisted = reconcileRouteState(
    await readRouteService(parsed, config, fetchImpl),
    parsed
  );
  if (persisted) return persisted;

  throw new UgoMcpError(
    "backend_invalid_response",
    "El backend no confirmó el inicio del traslado",
    502
  );
}
