const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ACTIVE_SERVICE_STATES = [
  "borrador",
  "buscando",
  "ofrecido",
  "asignado",
  "en_camino",
  "llegado",
  "en_progreso",
  "esperando_aprobacion",
];

export class UgoMcpError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = "UgoMcpError";
    this.code = code;
    this.status = status;
  }
}

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new UgoMcpError("invalid_input", `${field} requerido`, 400);
  return text;
}

function requiredConfig(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new UgoMcpError("invalid_config", `${field} no configurada`, 500);
  return text;
}

function assertUuid(value, field) {
  const text = requiredString(value, field);
  if (!UUID_RE.test(text)) {
    throw new UgoMcpError("invalid_input", `${field} debe ser UUID`, 400);
  }
  return text;
}

export function validateCurrentJobInput(input = {}) {
  const userId = assertUuid(input.userId, "userId");
  const role = requiredString(input.role, "role");
  if (role !== "client" && role !== "provider") {
    throw new UgoMcpError("invalid_input", "role debe ser client o provider", 400);
  }

  const serviceId =
    input.serviceId == null || String(input.serviceId).trim() === ""
      ? null
      : assertUuid(input.serviceId, "serviceId");

  return { userId, role, serviceId };
}

export function loadRuntimeConfig(env = process.env) {
  const supabaseUrl = requiredConfig(env.UGO_MCP_SUPABASE_URL, "UGO_MCP_SUPABASE_URL").replace(/\/+$/, "");
  const publishableKey = requiredConfig(
    env.UGO_MCP_SUPABASE_PUBLISHABLE_KEY,
    "UGO_MCP_SUPABASE_PUBLISHABLE_KEY"
  );
  const accessToken = requiredConfig(env.UGO_MCP_USER_ACCESS_TOKEN, "UGO_MCP_USER_ACCESS_TOKEN");

  let projectRef;
  try {
    projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  } catch {
    throw new UgoMcpError("invalid_config", "UGO_MCP_SUPABASE_URL inválida", 500);
  }

  const expectedProjectRef = String(env.UGO_MCP_EXPECTED_PROJECT_REF ?? "").trim();
  if (expectedProjectRef && projectRef !== expectedProjectRef) {
    throw new UgoMcpError(
      "wrong_project",
      `El MCP apunta a ${projectRef}, no al proyecto esperado ${expectedProjectRef}`,
      500
    );
  }

  return { supabaseUrl, publishableKey, accessToken, projectRef };
}

function requestHeaders(config) {
  return {
    accept: "application/json",
    apikey: config.publishableKey,
    authorization: `Bearer ${config.accessToken}`,
  };
}

async function fetchJson(fetchImpl, url, config) {
  let response;
  try {
    response = await fetchImpl(url, { method: "GET", headers: requestHeaders(config) });
  } catch {
    throw new UgoMcpError("backend_unavailable", "No se pudo contactar Supabase", 503);
  }

  if (!response?.ok) {
    const status = Number(response?.status) || 502;
    const code =
      status === 401 || status === 403 ? "authentication_failed" : "backend_error";
    throw new UgoMcpError(code, `Supabase respondió HTTP ${status}`, status);
  }

  try {
    return await response.json();
  } catch {
    throw new UgoMcpError("backend_invalid_response", "Supabase devolvió una respuesta inválida", 502);
  }
}

async function resolveAuthenticatedUser(fetchImpl, config) {
  const user = await fetchJson(fetchImpl, `${config.supabaseUrl}/auth/v1/user`, config);
  const id = typeof user?.id === "string" ? user.id : "";
  if (!UUID_RE.test(id)) {
    throw new UgoMcpError("authentication_failed", "La sesión no identifica un usuario válido", 401);
  }
  return id;
}

async function verifyRole(fetchImpl, config, userId, role) {
  const params = new URLSearchParams({
    select: "id,tipo,activo",
    id: `eq.${userId}`,
    limit: "1",
  });
  const rows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/usuarios?${params.toString()}`,
    config
  );
  const profile = Array.isArray(rows) ? rows[0] : null;
  const expectedType = role === "client" ? "cliente" : "proveedor";

  return Boolean(
    profile &&
      profile.id === userId &&
      profile.tipo === expectedType &&
      profile.activo === true
  );
}

const SERVICE_SELECT = [
  "id",
  "numero",
  "cliente_id",
  "proveedor_id",
  "categoria_id",
  "estado",
  "descripcion",
  "direccion_cliente",
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

function sanitizeService(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: row.id ?? null,
    numero: row.numero ?? null,
    cliente_id: row.cliente_id ?? null,
    proveedor_id: row.proveedor_id ?? null,
    categoria_id: row.categoria_id ?? null,
    estado: row.estado ?? null,
    descripcion: row.descripcion ?? null,
    direccion_cliente: row.direccion_cliente ?? null,
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

function candidateSummary(row) {
  return {
    service_id: row?.id ?? null,
    numero: row?.numero ?? null,
    estado: row?.estado ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

export async function getCurrentJob(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  const { userId, role, serviceId } = validateCurrentJobInput(input);
  if (typeof fetchImpl !== "function") {
    throw new UgoMcpError("runtime_error", "fetch no está disponible", 500);
  }

  const config = loadRuntimeConfig(env);
  const authenticatedUserId = await resolveAuthenticatedUser(fetchImpl, config);

  if (authenticatedUserId !== userId) {
    return {
      status: "unauthorized",
      role,
      user_id: userId,
      service: null,
      reason: "authenticated_user_mismatch",
    };
  }

  const roleAllowed = await verifyRole(fetchImpl, config, userId, role);
  if (!roleAllowed) {
    return {
      status: "unauthorized",
      role,
      user_id: userId,
      service: null,
      reason: "role_or_account_mismatch",
    };
  }

  const ownerField = role === "client" ? "cliente_id" : "proveedor_id";
  const params = new URLSearchParams({
    select: SERVICE_SELECT,
    [ownerField]: `eq.${userId}`,
    order: "updated_at.desc",
    limit: serviceId ? "1" : "2",
  });

  if (serviceId) {
    params.set("id", `eq.${serviceId}`);
  } else {
    params.set("estado", `in.(${ACTIVE_SERVICE_STATES.join(",")})`);
  }

  const rows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/servicios?${params.toString()}`,
    config
  );
  const services = Array.isArray(rows) ? rows : [];

  if (serviceId) {
    const service = sanitizeService(services[0]);
    if (!service) {
      return {
        status: "not_found_or_unauthorized",
        role,
        user_id: userId,
        requested_service_id: serviceId,
        service: null,
      };
    }
    return { status: "ok", role, user_id: userId, service };
  }

  if (services.length === 0) {
    return { status: "none", role, user_id: userId, service: null };
  }

  if (services.length > 1) {
    return {
      status: "ambiguous",
      role,
      user_id: userId,
      service: null,
      candidates: services.slice(0, 2).map(candidateSummary),
      reason: "multiple_active_services_require_service_id",
    };
  }

  return {
    status: "ok",
    role,
    user_id: userId,
    service: sanitizeService(services[0]),
  };
}
