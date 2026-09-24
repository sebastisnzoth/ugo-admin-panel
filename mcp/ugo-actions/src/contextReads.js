import {
  UgoMcpError,
  assertUuid,
  fetchJson,
  loadRuntimeConfig,
  resolveAuthenticatedUser,
  verifyRole,
} from "./currentJob.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function validateRole(value) {
  const role = String(value ?? "").trim();
  if (role !== "client" && role !== "provider") {
    throw new UgoMcpError("invalid_input", "role debe ser client o provider", 400);
  }
  return role;
}

function validateLimit(value, field = "limit") {
  if (value == null || value === "") return DEFAULT_LIMIT;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new UgoMcpError("invalid_input", `${field} debe ser un entero entre 1 y ${MAX_LIMIT}`, 400);
  }
  return limit;
}

export function validateContextInput(input = {}, { requiredRole = null, withLimit = false } = {}) {
  const parsed = {
    userId: assertUuid(input.userId, "userId"),
    role: validateRole(input.role),
  };
  if (requiredRole && parsed.role !== requiredRole) {
    throw new UgoMcpError("invalid_input", `role debe ser ${requiredRole}`, 400);
  }
  return withLimit ? { ...parsed, limit: validateLimit(input.limit) } : parsed;
}

async function authorizeContext(
  input,
  { env, fetchImpl, requiredRole = null, withLimit = false }
) {
  const parsed = validateContextInput(input, { requiredRole, withLimit });
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
        reason: "role_or_account_mismatch",
      },
    };
  }

  return { parsed, config, denied: null };
}

function ensureFetch(fetchImpl) {
  if (typeof fetchImpl !== "function") {
    throw new UgoMcpError("runtime_error", "fetch no está disponible", 500);
  }
}

function sanitizeUser(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: row.id ?? null,
    nombre: row.nombre ?? null,
    apellido: row.apellido ?? null,
    tipo: row.tipo ?? null,
    activo: row.activo ?? null,
    foto_url: row.foto_url ?? null,
    pais: row.pais ?? null,
    zona: row.zona ?? null,
    karma: row.karma ?? null,
    servicios_completados: row.servicios_completados ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function sanitizeClientProfile(row) {
  if (!row || typeof row !== "object") return null;
  return {
    usuario_id: row.usuario_id ?? null,
    idioma_preferido: row.idioma_preferido ?? null,
    contacto_preferido: row.contacto_preferido ?? null,
    horarios_preferidos: row.horarios_preferidos ?? null,
    instrucciones_acceso: row.instrucciones_acceso ?? null,
    preferencias_servicio: row.preferencias_servicio ?? null,
    onboarding_completo_at: row.onboarding_completo_at ?? null,
  };
}

function sanitizeProviderProfile(row) {
  if (!row || typeof row !== "object") return null;
  return {
    usuario_id: row.usuario_id ?? null,
    bio: row.bio ?? null,
    tarifa_base: row.tarifa_base ?? null,
    online: row.online ?? null,
    disponible: row.disponible ?? null,
    zona_radio_km: row.zona_radio_km ?? null,
    estado_verificacion: row.estado_verificacion ?? null,
    categoria_principal_id: row.categoria_principal_id ?? null,
    experiencia_anos: row.experiencia_anos ?? null,
    especialidades: row.especialidades ?? null,
    idiomas: row.idiomas ?? null,
    disponibilidad_horaria: row.disponibilidad_horaria ?? null,
    ciudad_base: row.ciudad_base ?? null,
    onboarding_completo_at: row.onboarding_completo_at ?? null,
  };
}

export async function getCurrentUser(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  ensureFetch(fetchImpl);
  const { parsed, config, denied } = await authorizeContext(input, { env, fetchImpl });
  if (denied) return { ...denied, user: null, profile: null };

  const userParams = new URLSearchParams({
    select:
      "id,nombre,apellido,tipo,activo,foto_url,pais,zona,karma,servicios_completados,created_at,updated_at",
    id: `eq.${parsed.userId}`,
    limit: "1",
  });
  const userRows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/usuarios?${userParams.toString()}`,
    config
  );
  const user = sanitizeUser(Array.isArray(userRows) ? userRows[0] : null);
  if (!user) {
    return {
      status: "not_found_or_unauthorized",
      role: parsed.role,
      user_id: parsed.userId,
      user: null,
      profile: null,
    };
  }

  const profileTable = parsed.role === "client" ? "perfiles_cliente" : "perfiles_proveedor";
  const profileSelect =
    parsed.role === "client"
      ? "usuario_id,idioma_preferido,contacto_preferido,horarios_preferidos,instrucciones_acceso,preferencias_servicio,onboarding_completo_at"
      : "usuario_id,bio,tarifa_base,online,disponible,zona_radio_km,estado_verificacion,categoria_principal_id,experiencia_anos,especialidades,idiomas,disponibilidad_horaria,ciudad_base,onboarding_completo_at";
  const profileParams = new URLSearchParams({
    select: profileSelect,
    usuario_id: `eq.${parsed.userId}`,
    limit: "1",
  });
  const profileRows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/${profileTable}?${profileParams.toString()}`,
    config
  );
  const rawProfile = Array.isArray(profileRows) ? profileRows[0] : null;
  const profile =
    parsed.role === "client"
      ? sanitizeClientProfile(rawProfile)
      : sanitizeProviderProfile(rawProfile);

  return {
    status: "ok",
    role: parsed.role,
    user_id: parsed.userId,
    user,
    profile,
  };
}

function sanitizeOffer(row) {
  const service = row?.servicio && typeof row.servicio === "object" ? row.servicio : null;
  const metadata =
    service?.metadata && typeof service.metadata === "object"
      ? {
          requested_when: service.metadata.requested_when ?? null,
          preferences: service.metadata.preferences ?? null,
          estimated_duration_minutes: service.metadata.estimated_duration_minutes ?? null,
        }
      : null;
  return {
    id: row?.id ?? null,
    servicio_id: row?.servicio_id ?? null,
    proveedor_id: row?.proveedor_id ?? null,
    estado: row?.estado ?? null,
    ranking: row?.ranking ?? null,
    distancia_km: row?.distancia_km ?? null,
    tarifa_ofrecida: row?.tarifa_ofrecida ?? null,
    expira_at: row?.expira_at ?? null,
    created_at: row?.created_at ?? null,
    servicio: service
      ? {
          id: service.id ?? null,
          numero: service.numero ?? null,
          categoria_id: service.categoria_id ?? null,
          estado: service.estado ?? null,
          descripcion: service.descripcion ?? null,
          urgencia: service.urgencia ?? null,
          zona_cliente: service.zona_cliente ?? null,
          programado_para: service.programado_para ?? null,
          tarifa: service.tarifa ?? null,
          moneda: service.moneda ?? null,
          created_at: service.created_at ?? null,
          metadata,
          cliente:
            service.cliente && typeof service.cliente === "object"
              ? { nombre: service.cliente.nombre ?? null }
              : null,
          categoria:
            service.categoria && typeof service.categoria === "object"
              ? {
                  nombre: service.categoria.nombre ?? null,
                  emoji: service.categoria.emoji ?? null,
                }
              : null,
        }
      : null,
  };
}

export async function getProviderOffers(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  ensureFetch(fetchImpl);
  const { parsed, config, denied } = await authorizeContext(input, {
    env,
    fetchImpl,
    requiredRole: "provider",
    withLimit: true,
  });
  if (denied) return { ...denied, offers: [] };

  const rows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/rpc/obtener_ofertas_proveedor`,
    config,
    { method: "POST", body: {} }
  );
  const offers = Array.isArray(rows) ? rows : [];
  for (const row of offers) {
    if (row?.proveedor_id && row.proveedor_id !== parsed.userId) {
      throw new UgoMcpError(
        "offer_scope_mismatch",
        "La oferta recibida no pertenece al proveedor autenticado",
        502
      );
    }
  }

  const sanitized = offers.slice(0, parsed.limit).map(sanitizeOffer);
  return {
    status: "ok",
    role: parsed.role,
    user_id: parsed.userId,
    count: sanitized.length,
    offers: sanitized,
  };
}

function sanitizePlace(row) {
  return {
    id: row?.id ?? null,
    etiqueta: row?.etiqueta ?? null,
    direccion: row?.direccion ?? null,
    complemento: row?.complemento ?? null,
    barrio: row?.barrio ?? null,
    ciudad: row?.ciudad ?? null,
    latitud: row?.latitud ?? null,
    longitud: row?.longitud ?? null,
    es_predeterminada: row?.es_predeterminada ?? false,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

export async function getSavedPlaces(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  ensureFetch(fetchImpl);
  const { parsed, config, denied } = await authorizeContext(input, {
    env,
    fetchImpl,
    requiredRole: "client",
    withLimit: true,
  });
  if (denied) return { ...denied, places: [] };

  const params = new URLSearchParams({
    select:
      "id,usuario_id,etiqueta,direccion,complemento,barrio,ciudad,latitud,longitud,es_predeterminada,created_at,updated_at",
    usuario_id: `eq.${parsed.userId}`,
    order: "es_predeterminada.desc,updated_at.desc",
    limit: String(parsed.limit),
  });
  const rows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/direcciones_cliente?${params.toString()}`,
    config
  );
  const places = Array.isArray(rows) ? rows : [];
  for (const row of places) {
    if (row?.usuario_id && row.usuario_id !== parsed.userId) {
      throw new UgoMcpError(
        "saved_place_scope_mismatch",
        "El lugar guardado recibido no pertenece al cliente autenticado",
        502
      );
    }
  }
  const sanitized = places.map(sanitizePlace);

  return {
    status: "ok",
    role: parsed.role,
    user_id: parsed.userId,
    count: sanitized.length,
    places: sanitized,
  };
}

function sanitizeHistoryService(row) {
  return {
    id: row?.id ?? null,
    numero: row?.numero ?? null,
    categoria_id: row?.categoria_id ?? null,
    estado: row?.estado ?? null,
    descripcion: row?.descripcion ?? null,
    programado_para: row?.programado_para ?? null,
    tarifa: row?.tarifa ?? null,
    moneda: row?.moneda ?? null,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
    aceptado_at: row?.aceptado_at ?? null,
    iniciado_at: row?.iniciado_at ?? null,
    completado_at: row?.completado_at ?? null,
    cancelado_at: row?.cancelado_at ?? null,
  };
}

export async function getJobHistory(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  ensureFetch(fetchImpl);
  const { parsed, config, denied } = await authorizeContext(input, {
    env,
    fetchImpl,
    withLimit: true,
  });
  if (denied) return { ...denied, services: [] };

  const ownerField = parsed.role === "client" ? "cliente_id" : "proveedor_id";
  const params = new URLSearchParams({
    select:
      "id,numero,cliente_id,proveedor_id,categoria_id,estado,descripcion,programado_para,tarifa,moneda,created_at,updated_at,aceptado_at,iniciado_at,completado_at,cancelado_at",
    [ownerField]: `eq.${parsed.userId}`,
    order: "updated_at.desc",
    limit: String(parsed.limit),
  });
  const rows = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/servicios?${params.toString()}`,
    config
  );
  const services = Array.isArray(rows) ? rows : [];
  for (const row of services) {
    const owner = parsed.role === "client" ? row?.cliente_id : row?.proveedor_id;
    if (owner && owner !== parsed.userId) {
      throw new UgoMcpError(
        "history_scope_mismatch",
        "El historial recibido contiene un servicio fuera del usuario autenticado",
        502
      );
    }
  }
  const sanitized = services.map(sanitizeHistoryService);

  return {
    status: "ok",
    role: parsed.role,
    user_id: parsed.userId,
    count: sanitized.length,
    services: sanitized,
  };
}
