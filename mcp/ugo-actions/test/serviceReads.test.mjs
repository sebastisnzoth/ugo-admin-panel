import test from "node:test";
import assert from "node:assert/strict";
import {
  getProviderLocation,
  getService,
  PROVIDER_LOCATION_FRESH_MS,
  validateServiceReadInput,
} from "../src/serviceReads.js";

const CLIENT_A = "11111111-1111-4111-8111-111111111111";
const CLIENT_B = "11111111-1111-4111-8111-222222222222";
const PROVIDER_A = "22222222-2222-4222-8222-222222222222";
const PROVIDER_B = "22222222-2222-4222-8222-333333333333";
const SERVICE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SERVICE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NOW = Date.parse("2026-09-24T16:00:00Z");

const env = {
  UGO_MCP_SUPABASE_URL: "https://trfsjuseqjxlhrxuvdsm.supabase.co",
  UGO_MCP_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
  UGO_MCP_USER_ACCESS_TOKEN: "user-session-token",
  UGO_MCP_EXPECTED_PROJECT_REF: "trfsjuseqjxlhrxuvdsm",
};

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

function serviceA(overrides = {}) {
  return {
    id: SERVICE_A,
    numero: 50,
    cliente_id: CLIENT_A,
    proveedor_id: PROVIDER_A,
    categoria_id: "33333333-3333-4333-8333-333333333333",
    estado: "en_camino",
    descripcion: "Servicio A",
    programado_para: null,
    tarifa: 120,
    moneda: "BRL",
    created_at: "2026-09-24T15:00:00Z",
    updated_at: "2026-09-24T15:59:00Z",
    aceptado_at: "2026-09-24T15:10:00Z",
    iniciado_at: null,
    completado_at: null,
    cancelado_at: null,
    metadata: { private: "must-not-leak" },
    ...overrides,
  };
}

function serviceB(overrides = {}) {
  return serviceA({
    id: SERVICE_B,
    numero: 51,
    cliente_id: CLIENT_B,
    proveedor_id: PROVIDER_B,
    descripcion: "Servicio B",
    ...overrides,
  });
}

function profileFor(userId, role) {
  return {
    id: userId,
    tipo: role === "client" ? "cliente" : "proveedor",
    activo: true,
  };
}

function makeFetch({
  authId,
  profile,
  services = [],
  trackingRows = [],
  failPath = null,
}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const parsed = new URL(String(url));

    if (failPath && parsed.pathname.includes(failPath)) {
      return response({ message: "upstream failure" }, 503);
    }
    if (parsed.pathname === "/auth/v1/user") {
      return response({ id: authId });
    }
    if (parsed.pathname === "/rest/v1/usuarios") {
      return response(profile ? [profile] : []);
    }
    if (parsed.pathname === "/rest/v1/servicios") {
      const requestedId = parsed.searchParams.get("id")?.replace(/^eq\./, "");
      const ownerClient = parsed.searchParams.get("cliente_id")?.replace(/^eq\./, "");
      const ownerProvider = parsed.searchParams.get("proveedor_id")?.replace(/^eq\./, "");
      const rows = services.filter((row) => {
        if (requestedId && row.id !== requestedId) return false;
        if (ownerClient && row.cliente_id !== ownerClient) return false;
        if (ownerProvider && row.proveedor_id !== ownerProvider) return false;
        return true;
      });
      return response(rows.slice(0, 1));
    }
    if (parsed.pathname === "/rest/v1/rpc/obtener_tracking_servicio_cliente") {
      const body = JSON.parse(String(options.body || "{}"));
      const requested = body.p_servicio_id;
      return response(trackingRows.filter((row) => row.service_id == null || row.service_id === requested));
    }
    return response({}, 404);
  };
  return { fetchImpl, calls };
}

test("ugo_get_service: cliente propietario obtiene sólo el serviceId exacto", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceB(), serviceA()],
  });
  const result = await getService(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env, fetchImpl }
  );
  assert.equal(result.status, "ok");
  assert.equal(result.service.id, SERVICE_A);
  assert.equal("metadata" in result.service, false);
  assert.equal("direccion_cliente" in result.service, false);
});

test("ugo_get_service: proveedor asignado obtiene su servicio", async () => {
  const { fetchImpl } = makeFetch({
    authId: PROVIDER_A,
    profile: profileFor(PROVIDER_A, "provider"),
    services: [serviceA()],
  });
  const result = await getService(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env, fetchImpl }
  );
  assert.equal(result.status, "ok");
  assert.equal(result.service.proveedor_id, PROVIDER_A);
});

test("ugo_get_service: usuario autenticado ajeno no puede suplantar userId", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: CLIENT_B,
    profile: profileFor(CLIENT_B, "client"),
    services: [serviceA()],
  });
  const result = await getService(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env, fetchImpl }
  );
  assert.equal(result.status, "unauthorized");
  assert.equal(calls.some(({ url }) => url.includes("/rest/v1/servicios")), false);
});

test("ugo_get_service: rol declarado incorrecto es rechazado", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA()],
  });
  const result = await getService(
    { userId: CLIENT_A, role: "provider", serviceId: SERVICE_A },
    { env, fetchImpl }
  );
  assert.equal(result.status, "unauthorized");
  assert.equal(result.reason, "role_or_account_mismatch");
  assert.equal(calls.some(({ url }) => url.includes("/rest/v1/servicios")), false);
});

test("ugo_get_service: serviceId inexistente devuelve not_found_or_unauthorized", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [],
  });
  const result = await getService(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env, fetchImpl }
  );
  assert.equal(result.status, "not_found_or_unauthorized");
});

test("ugo_get_service: serviceId de otro cliente no filtra hacia otro pedido", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA(), serviceB()],
  });
  const result = await getService(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_B },
    { env, fetchImpl }
  );
  assert.equal(result.status, "not_found_or_unauthorized");
  assert.equal(result.service, null);
});

test("ugo_get_service: serviceId obligatorio y UUID válido", () => {
  assert.throws(
    () => validateServiceReadInput({ userId: CLIENT_A, role: "client" }),
    (error) => error?.code === "invalid_input"
  );
  assert.throws(
    () => validateServiceReadInput({ userId: CLIENT_A, role: "client", serviceId: "50" }),
    (error) => error?.code === "invalid_input"
  );
});

test("ugo_get_service: backend error es controlado", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA()],
    failPath: "/rest/v1/servicios",
  });
  await assert.rejects(
    () => getService({ userId: CLIENT_A, role: "client", serviceId: SERVICE_A }, { env, fetchImpl }),
    (error) => error?.code === "backend_error" && error?.status === 503
  );
});

test("ugo_get_provider_location: cliente obtiene GPS fresco sólo de su proveedor", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA()],
    trackingRows: [{
      service_id: SERVICE_A,
      proveedor_id: PROVIDER_A,
      provider_lat: -27.59,
      provider_lng: -48.55,
      provider_updated_at: "2026-09-24T15:59:50Z",
    }],
  });
  const result = await getProviderLocation(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env, fetchImpl, nowMs: NOW }
  );
  assert.equal(result.status, "ok");
  assert.equal(result.provider_id, PROVIDER_A);
  assert.equal(result.location.freshness, "fresh");
});

test("ugo_get_provider_location: proveedor puede leer su tracking para ese serviceId", async () => {
  const { fetchImpl } = makeFetch({
    authId: PROVIDER_A,
    profile: profileFor(PROVIDER_A, "provider"),
    services: [serviceA()],
    trackingRows: [{
      service_id: SERVICE_A,
      proveedor_id: PROVIDER_A,
      provider_lat: -27.59,
      provider_lng: -48.55,
      provider_updated_at: "2026-09-24T15:59:50Z",
    }],
  });
  const result = await getProviderLocation(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env, fetchImpl, nowMs: NOW }
  );
  assert.equal(result.status, "ok");
  assert.equal(result.provider_id, PROVIDER_A);
});

test("ugo_get_provider_location: usuario ajeno no llega al RPC", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: CLIENT_B,
    profile: profileFor(CLIENT_B, "client"),
    services: [serviceA()],
  });
  const result = await getProviderLocation(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env, fetchImpl, nowMs: NOW }
  );
  assert.equal(result.status, "unauthorized");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/obtener_tracking")), false);
});

test("ugo_get_provider_location: serviceId equivocado no usa proveedor de otro servicio", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA(), serviceB()],
    trackingRows: [{
      service_id: SERVICE_B,
      proveedor_id: PROVIDER_B,
      provider_lat: -27.58,
      provider_lng: -48.54,
      provider_updated_at: "2026-09-24T15:59:50Z",
    }],
  });
  const result = await getProviderLocation(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_B },
    { env, fetchImpl, nowMs: NOW }
  );
  assert.equal(result.status, "not_found_or_unauthorized");
  assert.equal(result.provider_id, null);
  assert.equal(calls.some(({ url }) => url.includes("/rpc/obtener_tracking")), false);
});

test("ugo_get_provider_location: proveedor no asignado devuelve unavailable sin RPC", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA({ proveedor_id: null })],
  });
  const result = await getProviderLocation(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env, fetchImpl, nowMs: NOW }
  );
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "provider_not_assigned");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/obtener_tracking")), false);
});

test("ugo_get_provider_location: lat/lng null son unavailable", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA()],
    trackingRows: [{
      service_id: SERVICE_A,
      proveedor_id: PROVIDER_A,
      provider_lat: null,
      provider_lng: null,
      provider_updated_at: "2026-09-24T15:59:50Z",
    }],
  });
  const result = await getProviderLocation(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env, fetchImpl, nowMs: NOW }
  );
  assert.equal(result.location.freshness, "unavailable");
  assert.equal(result.location.lat, null);
  assert.equal(result.location.lng, null);
});

test("ugo_get_provider_location: 0,0 nunca es una posición válida", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA()],
    trackingRows: [{
      service_id: SERVICE_A,
      proveedor_id: PROVIDER_A,
      provider_lat: 0,
      provider_lng: 0,
      provider_updated_at: "2026-09-24T15:59:50Z",
    }],
  });
  const result = await getProviderLocation(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env, fetchImpl, nowMs: NOW }
  );
  assert.equal(result.location.freshness, "unavailable");
  assert.equal(result.location.lat, null);
  assert.equal(result.location.lng, null);
});

test("ugo_get_provider_location: coordenadas fuera de rango son unavailable", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA()],
    trackingRows: [{
      service_id: SERVICE_A,
      proveedor_id: PROVIDER_A,
      provider_lat: 91,
      provider_lng: -181,
      provider_updated_at: "2026-09-24T15:59:50Z",
    }],
  });
  const result = await getProviderLocation(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env, fetchImpl, nowMs: NOW }
  );
  assert.equal(result.location.freshness, "unavailable");
});

test("ugo_get_provider_location: posición vieja queda marcada stale", async () => {
  const old = new Date(NOW - PROVIDER_LOCATION_FRESH_MS - 1).toISOString();
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA()],
    trackingRows: [{
      service_id: SERVICE_A,
      proveedor_id: PROVIDER_A,
      provider_lat: -27.59,
      provider_lng: -48.55,
      provider_updated_at: old,
    }],
  });
  const result = await getProviderLocation(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env, fetchImpl, nowMs: NOW }
  );
  assert.equal(result.location.freshness, "stale");
  assert.equal(result.location.lat, -27.59);
});

test("ugo_get_provider_location: respuesta RPC de otro proveedor se rechaza", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA()],
    trackingRows: [{
      service_id: SERVICE_A,
      proveedor_id: PROVIDER_B,
      provider_lat: -27.59,
      provider_lng: -48.55,
      provider_updated_at: "2026-09-24T15:59:50Z",
    }],
  });
  await assert.rejects(
    () => getProviderLocation(
      { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
      { env, fetchImpl, nowMs: NOW }
    ),
    (error) => error?.code === "tracking_scope_mismatch"
  );
});

test("ugo_get_provider_location: backend RPC error es controlado", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_A,
    profile: profileFor(CLIENT_A, "client"),
    services: [serviceA()],
    failPath: "/rest/v1/rpc/obtener_tracking_servicio_cliente",
  });
  await assert.rejects(
    () => getProviderLocation(
      { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
      { env, fetchImpl, nowMs: NOW }
    ),
    (error) => error?.code === "backend_error" && error?.status === 503
  );
});

test("ugo_get_provider_location: no existe fallback a current job sin serviceId", () => {
  assert.throws(
    () => validateServiceReadInput({ userId: CLIENT_A, role: "client" }),
    (error) => error?.code === "invalid_input"
  );
});
