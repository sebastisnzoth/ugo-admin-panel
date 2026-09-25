import {
  UgoMcpError,
  requestHeaders,
} from "./currentJob.js";
import {
  authorizeActor,
  readOwnedService,
  validateServiceReadInput,
} from "./serviceReads.js";

export const RATE_SERVICE_VALIDATED_PROJECT_REFS = new Set([
  "tmossnqfwfwjrtzwcbmm",
]);

const ALLOWED_INPUT_KEYS = new Set([
  "userId",
  "role",
  "serviceId",
  "score",
  "comment",
]);

function normalizeComment(value) {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new UgoMcpError("invalid_input", "comment debe ser texto", 400);
  }

  const comment = value.trim();
  if (comment.length > 500) {
    throw new UgoMcpError(
      "invalid_input",
      "comment no puede superar 500 caracteres",
      400
    );
  }

  return comment || null;
}

export function validateRateServiceInput(input = {}) {
  for (const key of Object.keys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) {
      throw new UgoMcpError(
        "invalid_input",
        `ugo_rate_service no acepta el campo ${key}`,
        400
      );
    }
  }

  const parsed = validateServiceReadInput(input);
  if (
    typeof input.score !== "number" ||
    !Number.isInteger(input.score) ||
    input.score < 1 ||
    input.score > 5
  ) {
    throw new UgoMcpError(
      "invalid_input",
      "score debe ser un entero entre 1 y 5",
      400
    );
  }

  return {
    ...parsed,
    score: input.score,
    comment: normalizeComment(input.comment),
  };
}

function authorType(role) {
  return role === "client" ? "cliente" : "proveedor";
}

function ratingResult(parsed, {
  idempotent = false,
  reconciled = false,
} = {}) {
  return {
    status: "rated_service",
    service_id: parsed.serviceId,
    state: "completado",
    author_role: parsed.role,
    score: parsed.score,
    comment_saved: parsed.comment !== null,
    idempotent: Boolean(idempotent),
    reconciled: Boolean(reconciled),
  };
}

async function readRatingService(parsed, config, fetchImpl) {
  return await readOwnedService(
    parsed,
    config,
    fetchImpl,
    "id,cliente_id,proveedor_id,estado,updated_at"
  );
}

function validateOwnedService(service, parsed) {
  if (!service) return null;

  const ownerId =
    parsed.role === "client" ? service.cliente_id : service.proveedor_id;

  if (service.id !== parsed.serviceId || ownerId !== parsed.userId) {
    throw new UgoMcpError(
      "scope_mismatch",
      "El servicio recibido no coincide con el usuario/rol/serviceId solicitado",
      502
    );
  }

  return service;
}

function validateParticipants(service) {
  if (
    typeof service?.cliente_id !== "string" ||
    !service.cliente_id ||
    typeof service?.proveedor_id !== "string" ||
    !service.proveedor_id
  ) {
    throw new UgoMcpError(
      "backend_invalid_response",
      "El servicio completado no tiene ambas partes identificadas",
      502
    );
  }
}

function validateRatingRow(row, parsed, service) {
  if (!row) return null;

  if (
    row.servicio_id !== parsed.serviceId ||
    row.cliente_id !== service.cliente_id ||
    row.proveedor_id !== service.proveedor_id ||
    row.autor_tipo !== authorType(parsed.role)
  ) {
    throw new UgoMcpError(
      "scope_mismatch",
      "La calificación recibida no pertenece al serviceId, partes o autor solicitados",
      502
    );
  }

  return row;
}

async function readExistingRating(parsed, service, config, fetchImpl) {
  const params = new URLSearchParams({
    select: "id,servicio_id,cliente_id,proveedor_id,autor_tipo,puntuacion,comentario,created_at",
    servicio_id: `eq.${parsed.serviceId}`,
    autor_tipo: `eq.${authorType(parsed.role)}`,
    limit: "1",
  });

  if (parsed.role === "client") {
    params.set("cliente_id", `eq.${parsed.userId}`);
  } else {
    params.set("proveedor_id", `eq.${parsed.userId}`);
  }

  let response;
  try {
    response = await fetchImpl(
      `${config.supabaseUrl}/rest/v1/resenas?${params.toString()}`,
      {
        method: "GET",
        headers: requestHeaders(config),
      }
    );
  } catch {
    throw new UgoMcpError(
      "backend_unavailable",
      "No se pudo contactar Supabase",
      503
    );
  }

  if (!response?.ok) {
    const status = Number(response?.status) || 502;
    throw new UgoMcpError(
      status === 401 || status === 403
        ? "authentication_failed"
        : "backend_error",
      `Supabase respondió HTTP ${status}`,
      status
    );
  }

  let rows;
  try {
    rows = await response.json();
  } catch {
    throw new UgoMcpError(
      "backend_invalid_response",
      "Supabase devolvió una respuesta inválida",
      502
    );
  }

  const row = Array.isArray(rows) ? rows[0] ?? null : null;
  return validateRatingRow(row, parsed, service);
}

function sameRating(row, parsed) {
  return Boolean(
    row &&
      Number(row.puntuacion) === parsed.score &&
      normalizeComment(row.comentario) === parsed.comment
  );
}

function existingRatingResult(row, parsed) {
  if (!row) return null;

  if (sameRating(row, parsed)) {
    return ratingResult(parsed, { idempotent: true });
  }

  return {
    status: "rejected",
    code: "already_rated",
    service_id: parsed.serviceId,
    state: "completado",
    author_role: parsed.role,
  };
}

async function insertRating(parsed, service, config, fetchImpl) {
  let response;

  try {
    response = await fetchImpl(
      `${config.supabaseUrl}/rest/v1/resenas`,
      {
        method: "POST",
        headers: {
          ...requestHeaders(config),
          "content-type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          servicio_id: parsed.serviceId,
          cliente_id: service.cliente_id,
          proveedor_id: service.proveedor_id,
          autor_tipo: authorType(parsed.role),
          puntuacion: parsed.score,
          comentario: parsed.comment,
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

  const row = Array.isArray(body) ? body[0] ?? null : body;
  if (!row || typeof row !== "object") return null;

  validateRatingRow(row, parsed, service);

  if (!sameRating(row, parsed)) {
    throw new UgoMcpError(
      "backend_invalid_response",
      "El backend devolvió una calificación distinta de la solicitada",
      502
    );
  }

  return row;
}

export async function rateService(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new UgoMcpError("runtime_error", "fetch no está disponible", 500);
  }

  const validated = validateRateServiceInput(input);
  const { parsed: identity, config, denied } = await authorizeActor(validated, {
    env,
    fetchImpl,
  });
  const parsed = {
    ...identity,
    score: validated.score,
    comment: validated.comment,
  };

  if (denied) {
    return {
      status: "rejected",
      code: "unauthorized",
      service_id: parsed.serviceId,
      state: null,
    };
  }

  if (!RATE_SERVICE_VALIDATED_PROJECT_REFS.has(config.projectRef)) {
    throw new UgoMcpError(
      "backend_contract_not_ready",
      `ugo_rate_service está bloqueado para ${config.projectRef}: el contrato bilateral de resenas todavía no fue promovido y validado en ese backend`,
      409
    );
  }

  const service = validateOwnedService(
    await readRatingService(parsed, config, fetchImpl),
    parsed
  );

  if (!service) {
    return {
      status: "rejected",
      code: "not_found_or_unauthorized",
      service_id: parsed.serviceId,
      state: null,
    };
  }

  const state = String(service.estado ?? "");
  if (state !== "completado") {
    return {
      status: "rejected",
      code: "invalid_state",
      service_id: parsed.serviceId,
      state: state || null,
    };
  }

  validateParticipants(service);

  const existing = await readExistingRating(
    parsed,
    service,
    config,
    fetchImpl
  );
  const existingResult = existingRatingResult(existing, parsed);
  if (existingResult) return existingResult;

  try {
    await insertRating(parsed, service, config, fetchImpl);
  } catch (error) {
    try {
      const persisted = await readExistingRating(
        parsed,
        service,
        config,
        fetchImpl
      );

      if (persisted) {
        if (sameRating(persisted, parsed)) {
          return ratingResult(parsed, {
            idempotent: true,
            reconciled: true,
          });
        }

        return {
          status: "rejected",
          code: "already_rated",
          service_id: parsed.serviceId,
          state: "completado",
          author_role: parsed.role,
        };
      }
    } catch {
      // Preserve the original insert failure when recovery cannot be proven.
    }

    throw error;
  }

  const persisted = await readExistingRating(
    parsed,
    service,
    config,
    fetchImpl
  );

  if (!persisted || !sameRating(persisted, parsed)) {
    throw new UgoMcpError(
      "backend_invalid_response",
      "El backend no confirmó la calificación persistida",
      502
    );
  }

  return ratingResult(parsed);
}
