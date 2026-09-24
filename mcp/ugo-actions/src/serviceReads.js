import {
  UgoMcpError,
  assertUuid,
  fetchJson,
  loadRuntimeConfig,
  resolveAuthenticatedUser,
  verifyRole,
} from "./currentJob.js";

export const PROVIDER_LOCATION_FRESH_MS = 30_000;
const CLOCK_SKEW_TOLERANCE_MS = 5_000;

const SERVICE_READ_SELECT = [
  "id",
  "numero",
  "cliente_id",
  "proveedor_id",
  "categoria_id",
  "estado",
  "descripcion",
  "programado_para",
  "tarifa",
  "moneda",
  "created_at",
  "updated_at",
  "aceptado_at",
  "iniciado_at",
  "completado_at",
  "cancelado_at",
].join(",");

function validateRole(role) {
  const value = String(role ?? "").trim();
  if (value !== "client" && value !== "provider") {
    throw new UgoMcpError("invalid_input", "role debe ser client o provider", 400);
  }
  return value;
}

export function validateServiceReadInput(input = {}) {
  return {
    userId: assertUuid(input.userId, "userId"),
    role: validateRole(input.role),
    serviceId: assertUuid(input.serviceId, "serviceId"),
  };
}

async function authorizeActor(input, { env, fetchImpl }) {
  const parsed = validateServiceReadInput(input);
  const config = loadRuntimeConfig(env);
  const authenticatedUserId = await resolveAuthenticatedUser(fetchImpl, config);

  if (authenticatedUserId !== parsed.userId) {
    return {
      parsed,
      config,
      denied: {
        status: "unauthorized",
        role: parsed.role,
        user_id: parsed.userId,
        service: null,
        reason: "authenticated_user_mismatch",
      },
    };
  }

  const roleAllowed = await verifyRole(fetchImpl, config, parsed.userId, parsed.role);
  if (!roleAllowed) {
    return {
      parsed,
      config,
      denied: {
        status: "unauthorized",
        role: parsed.role,
        user_id: parsed.userId,
        service: null,
        reason: "role_or_account_mismatch",
      },
    };
  }

  return { parsed, config, denied: null };
}

function serviceFields(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: row.id ?? null,
    numero: row.numero ?? null,
    cliente_id: row.cliente_id ?? null,
    proveedor_id: row.proveedor_id ?? null,
    categoria_id: row.categoria_id ?? null,
    estado: row.estado ?? null,
    descripcion: row.descripcion ?? null,
    programado_para: row.programado_para ?? null,
    tarifa: row.tarifa ?? null,
    moneda: row.moneda ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    aceptado_at: row.aceptado_at ?? null,
    iniciado_at: row.iniciado_at ?? null,
    completado_at: row.completado_at ?? null,
    cancelado_at: row.cancelado_at ?? null,
  };
}

async function readOwnedService(parsed, config, fetchImpl, select = SERVICE_READ_SELECT) {
  const ownerField = parsed.role === "client" ? "cliente_id" : "proveedor_id";
  const params = new URLSearchParams({
    select,
    id: `eq.${parsed.serviceId}`,
    [ownerField]: `eq.${parsed.userId}`,
    limit: "1",
  });
  const rows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/servicios?${params.toString()}`,
    config
  );
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function getService(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new UgoMcpError("runtime_error", "fetch no está disponible", 500);
  }

  const { parsed, config, denied } = await authorizeActor(input, { env, fetchImpl });
  if (denied) return denied;

  const row = await readOwnedService(parsed, config, fetchImpl);
  const service = serviceFields(row);
  if (!service) {
    return {
      status: "not_found_or_unauthorized",
      role: parsed.role,
      user_id: parsed.userId,
      requested_service_id: parsed.serviceId,
      service: null,
    };
  }

  return {
    status: "ok",
    role: parsed.role,
    user_id: parsed.userId,
    service,
  };
}

function unavailableLocation(providerId = null, updatedAt = null) {
  return {
    provider_id: providerId,
    location: {
      lat: null,
      lng: null,
      updated_at: updatedAt,
      freshness: "unavailable",
    },
  };
}

export function normalizeProviderLocation(row, nowMs = Date.now()) {
  const providerId = typeof row?.proveedor_id === "string" ? row.proveedor_id : null;
  const rawLat = row?.provider_lat;
  const rawLng = row?.provider_lng;
  const lat = rawLat == null ? NaN : Number(rawLat);
  const lng = rawLng == null ? NaN : Number(rawLng);
  const updatedAt = typeof row?.provider_updated_at === "string" ? row.provider_updated_at : null;

  const validCoordinates =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001);

  if (!validCoordinates) {
    return unavailableLocation(providerId, updatedAt);
  }

  const updatedMs = updatedAt ? new Date(updatedAt).getTime() : NaN;
  if (!Number.isFinite(updatedMs)) {
    return {
      provider_id: providerId,
      location: { lat, lng, updated_at: updatedAt, freshness: "unavailable" },
    };
  }

  const ageMs = nowMs - updatedMs;
  const freshness =
    ageMs >= -CLOCK_SKEW_TOLERANCE_MS && ageMs <= PROVIDER_LOCATION_FRESH_MS
      ? "fresh"
      : "stale";

  return {
    provider_id: providerId,
    location: { lat, lng, updated_at: updatedAt, freshness },
  };
}

export async function getProviderLocation(
  input,
  { env = process.env, fetchImpl = globalThis.fetch, nowMs = Date.now() } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new UgoMcpError("runtime_error", "fetch no está disponible", 500);
  }

  const { parsed, config, denied } = await authorizeActor(input, { env, fetchImpl });
  if (denied) {
    return {
      ...denied,
      service_id: parsed.serviceId,
      provider_id: null,
      location: unavailableLocation().location,
    };
  }

  const service = await readOwnedService(
    parsed,
    config,
    fetchImpl,
    "id,cliente_id,proveedor_id,estado"
  );

  if (!service) {
    return {
      status: "not_found_or_unauthorized",
      role: parsed.role,
      user_id: parsed.userId,
      service_id: parsed.serviceId,
      provider_id: null,
      location: unavailableLocation().location,
    };
  }

  if (!service.proveedor_id) {
    return {
      status: "unavailable",
      role: parsed.role,
      user_id: parsed.userId,
      service_id: parsed.serviceId,
      ...unavailableLocation(),
      reason: "provider_not_assigned",
    };
  }

  const rpcRows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/rpc/obtener_tracking_servicio_cliente`,
    config,
    { method: "POST", body: { p_servicio_id: parsed.serviceId } }
  );
  const row = Array.isArray(rpcRows) ? rpcRows[0] ?? null : rpcRows ?? null;

  if (!row) {
    return {
      status: "unavailable",
      role: parsed.role,
      user_id: parsed.userId,
      service_id: parsed.serviceId,
      ...unavailableLocation(service.proveedor_id),
      reason: "tracking_not_available",
    };
  }

  const responseServiceId =
    typeof row.servicio_id === "string"
      ? row.servicio_id
      : typeof row.service_id === "string"
        ? row.service_id
        : null;

  if (responseServiceId && responseServiceId !== parsed.serviceId) {
    throw new UgoMcpError(
      "tracking_scope_mismatch",
      "El tracking recibido no pertenece al serviceId solicitado",
      502
    );
  }

  if (row.proveedor_id && row.proveedor_id !== service.proveedor_id) {
    throw new UgoMcpError(
      "tracking_scope_mismatch",
      "El tracking recibido no pertenece al proveedor del serviceId solicitado",
      502
    );
  }

  const normalized = normalizeProviderLocation(
    { ...row, proveedor_id: service.proveedor_id },
    nowMs
  );

  return {
    status: "ok",
    role: parsed.role,
    user_id: parsed.userId,
    service_id: parsed.serviceId,
    ...normalized,
  };
}
