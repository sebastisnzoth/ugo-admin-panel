import { UgoMcpError, fetchJson } from "./currentJob.js";
import {
  authorizeActor,
  readOwnedService,
  validateServiceReadInput,
} from "./serviceReads.js";

export function validateArrivalInput(input = {}) {
  const parsed = validateServiceReadInput(input);
  if (parsed.role !== "provider") {
    throw new UgoMcpError("invalid_input", "ugo_mark_arrived requiere role=provider", 400);
  }
  return parsed;
}

function normalizeArrivalResponse(value, serviceId) {
  if (!value || typeof value !== "object") {
    throw new UgoMcpError(
      "backend_invalid_response",
      "El backend no devolvió un resultado de llegada válido",
      502
    );
  }

  const responseServiceId =
    typeof value.service_id === "string" ? value.service_id : serviceId;
  if (responseServiceId !== serviceId) {
    throw new UgoMcpError(
      "arrival_scope_mismatch",
      "El backend devolvió una llegada para otro serviceId",
      502
    );
  }

  const status = String(value.status ?? "");
  if (status === "arrived") {
    if (value.state != null && value.state !== "llegado") {
      throw new UgoMcpError(
        "backend_invalid_response",
        "El backend confirmó llegada con un estado incompatible",
        502
      );
    }
    return {
      status: "arrived",
      service_id: responseServiceId,
      previous_state: value.previous_state ?? null,
      state: value.state ?? "llegado",
      distance_m: value.distance_m == null ? null : Number(value.distance_m),
      location_age_ms:
        value.location_age_ms == null ? null : Number(value.location_age_ms),
      idempotent: Boolean(value.idempotent),
    };
  }

  if (status === "rejected") {
    return {
      status: "rejected",
      code: String(value.code ?? "backend_rejected"),
      service_id: responseServiceId,
      state: value.state ?? null,
      distance_m: value.distance_m == null ? null : Number(value.distance_m),
      location_age_ms:
        value.location_age_ms == null ? null : Number(value.location_age_ms),
    };
  }

  throw new UgoMcpError(
    "backend_invalid_response",
    "El backend devolvió un estado de llegada desconocido",
    502
  );
}

export async function markArrived(
  input,
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new UgoMcpError("runtime_error", "fetch no está disponible", 500);
  }

  const parsedInput = validateArrivalInput(input);
  const { parsed, config, denied } = await authorizeActor(parsedInput, {
    env,
    fetchImpl,
  });

  if (denied) {
    return {
      status: "rejected",
      code: "unauthorized",
      service_id: parsed.serviceId,
      state: null,
      distance_m: null,
    };
  }

  const service = await readOwnedService(
    parsed,
    config,
    fetchImpl,
    "id,proveedor_id,estado"
  );

  if (!service || service.proveedor_id !== parsed.userId) {
    return {
      status: "rejected",
      code: "unauthorized",
      service_id: parsed.serviceId,
      state: null,
      distance_m: null,
    };
  }

  const response = await fetchJson(
    fetchImpl,
    `${config.supabaseUrl}/rest/v1/rpc/marcar_llegada_proveedor`,
    config,
    {
      method: "POST",
      body: { p_servicio_id: parsed.serviceId },
    }
  );

  return normalizeArrivalResponse(response, parsed.serviceId);
}
