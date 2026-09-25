import {
  UgoMcpError,
  assertUuid,
  fetchJson,
} from "./currentJob.js";
import {
  authorizeActor,
  validateServiceReadInput,
} from "./serviceReads.js";

export const ACCEPT_JOB_VALIDATED_PROJECT_REFS = new Set([
  "tmossnqfwfwjrtzwcbmm",
]);

const ACCEPTED_SERVICE_STATES = new Set([
  "asignado",
  "en_camino",
  "llegado",
  "en_progreso",
  "esperando_aprobacion",
  "completado",
]);

export function validateAcceptJobInput(input = {}) {
  const parsed = validateServiceReadInput(input);
  if (parsed.role !== "provider") {
    throw new UgoMcpError(
      "invalid_input",
      "ugo_accept_job requiere role=provider",
      400
    );
  }
  return {
    ...parsed,
    offerId: assertUuid(input.offerId, "offerId"),
  };
}

async function readOwnedOffer(parsed, config, fetchImpl) {
  const params = new URLSearchParams({
    select: "id,servicio_id,proveedor_id,estado,expira_at,respondida_at",
    id: `eq.${parsed.offerId}`,
    proveedor_id: `eq.${parsed.userId}`,
    limit: "1",
  });
  const rows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/ofertas_servicio?${params.toString()}`,
    config
  );
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function readAcceptedService(parsed, config, fetchImpl) {
  const params = new URLSearchParams({
    select: "id,proveedor_id,estado,aceptado_at,updated_at",
    id: `eq.${parsed.serviceId}`,
    proveedor_id: `eq.${parsed.userId}`,
    limit: "1",
  });
  const rows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/servicios?${params.toString()}`,
    config
  );
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

function assertOfferScope(offer, parsed) {
  if (offer?.id && offer.id !== parsed.offerId) {
    throw new UgoMcpError(
      "offer_scope_mismatch",
      "La oferta recibida no coincide con offerId",
      502
    );
  }
  if (offer?.proveedor_id && offer.proveedor_id !== parsed.userId) {
    throw new UgoMcpError(
      "offer_scope_mismatch",
      "La oferta recibida pertenece a otro proveedor",
      502
    );
  }
  if (offer?.servicio_id && offer.servicio_id !== parsed.serviceId) {
    throw new UgoMcpError(
      "offer_scope_mismatch",
      "La oferta recibida pertenece a otro serviceId",
      502
    );
  }
}

function acceptedResult(parsed, service, { idempotent, reconciled }) {
  return {
    status: "accepted",
    offer_id: parsed.offerId,
    service_id: parsed.serviceId,
    state: service.estado,
    idempotent: Boolean(idempotent),
    reconciled: Boolean(reconciled),
  };
}

async function reconcileAcceptance(parsed, config, fetchImpl) {
  const offer = await readOwnedOffer(parsed, config, fetchImpl);
  if (!offer) return null;
  assertOfferScope(offer, parsed);
  if (offer.estado !== "aceptada") return null;

  const service = await readAcceptedService(parsed, config, fetchImpl);
  if (
    !service ||
    service.id !== parsed.serviceId ||
    service.proveedor_id !== parsed.userId ||
    !ACCEPTED_SERVICE_STATES.has(String(service.estado ?? ""))
  ) {
    return null;
  }

  return acceptedResult(parsed, service, {
    idempotent: true,
    reconciled: true,
  });
}

function normalizeAcceptedBackendResponse(value, parsed) {
  const row = Array.isArray(value) ? value[0] ?? null : value;
  if (!row || typeof row !== "object") return null;

  if (row.id !== parsed.serviceId) {
    throw new UgoMcpError(
      "accept_scope_mismatch",
      "El backend devolvió aceptación para otro serviceId",
      502
    );
  }
  if (row.proveedor_id !== parsed.userId) {
    throw new UgoMcpError(
      "accept_scope_mismatch",
      "El backend asignó la aceptación a otro proveedor",
      502
    );
  }
  if (!ACCEPTED_SERVICE_STATES.has(String(row.estado ?? ""))) {
    throw new UgoMcpError(
      "backend_invalid_response",
      "El backend confirmó aceptación con un estado incompatible",
      502
    );
  }

  return acceptedResult(parsed, row, {
    idempotent: false,
    reconciled: false,
  });
}

export async function acceptJob(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new UgoMcpError("runtime_error", "fetch no está disponible", 500);
  }

  const validated = validateAcceptJobInput(input);
  const { parsed: actor, config, denied } = await authorizeActor(validated, {
    env,
    fetchImpl,
  });
  const parsed = { ...actor, offerId: validated.offerId };

  if (denied) {
    return {
      status: "rejected",
      code: "unauthorized",
      offer_id: parsed.offerId,
      service_id: parsed.serviceId,
      state: null,
    };
  }

  if (!ACCEPT_JOB_VALIDATED_PROJECT_REFS.has(config.projectRef)) {
    throw new UgoMcpError(
      "backend_contract_not_ready",
      `ugo_accept_job está bloqueado para ${config.projectRef}: el contrato de deuda/agenda todavía no fue promovido y validado en ese backend`,
      409
    );
  }

  const offer = await readOwnedOffer(parsed, config, fetchImpl);
  if (!offer) {
    return {
      status: "rejected",
      code: "unauthorized",
      offer_id: parsed.offerId,
      service_id: parsed.serviceId,
      state: null,
    };
  }
  assertOfferScope(offer, parsed);

  if (offer.estado === "aceptada") {
    const persisted = await reconcileAcceptance(parsed, config, fetchImpl);
    if (persisted) return persisted;
    throw new UgoMcpError(
      "backend_invalid_response",
      "La oferta figura aceptada pero el servicio persistido no confirma la asignación",
      502
    );
  }

  if (offer.estado !== "pendiente") {
    return {
      status: "rejected",
      code: offer.estado === "expirada" ? "offer_expired" : "offer_unavailable",
      offer_id: parsed.offerId,
      service_id: parsed.serviceId,
      state: null,
    };
  }

  let response;
  try {
    response = await fetchJson(
      fetchImpl,
      `${config.supabaseUrl}/rest/v1/rpc/aceptar_oferta`,
      config,
      { method: "POST", body: { p_oferta_id: parsed.offerId } }
    );
  } catch (error) {
    try {
      const persisted = await reconcileAcceptance(parsed, config, fetchImpl);
      if (persisted) return persisted;
    } catch {
      // Preserve the original mutation failure if recovery cannot be verified.
    }
    throw error;
  }

  const normalized = normalizeAcceptedBackendResponse(response, parsed);
  if (normalized) return normalized;

  const persisted = await reconcileAcceptance(parsed, config, fetchImpl);
  if (persisted) return persisted;

  return {
    status: "rejected",
    code: "offer_unavailable",
    offer_id: parsed.offerId,
    service_id: parsed.serviceId,
    state: null,
  };
}
