import test from "node:test";
import assert from "node:assert/strict";
import {
  getCurrentJob,
  loadRuntimeConfig,
  validateCurrentJobInput,
} from "../src/currentJob.js";

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";
const PROVIDER_ID = "22222222-2222-4222-8222-222222222222";
const SERVICE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SERVICE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const baseEnv = {
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

function service(overrides = {}) {
  return {
    id: SERVICE_A,
    numero: 50,
    cliente_id: CLIENT_ID,
    proveedor_id: PROVIDER_ID,
    categoria_id: "33333333-3333-4333-8333-333333333333",
    estado: "en_progreso",
    descripcion: "Reparar pérdida",
    direccion_cliente: "Dirección autorizada",
    programado_para: null,
    tarifa: 120,
    moneda: "BRL",
    created_at: "2026-09-24T12:00:00Z",
    updated_at: "2026-09-24T12:30:00Z",
    aceptado_at: "2026-09-24T12:05:00Z",
    iniciado_at: "2026-09-24T12:25:00Z",
    completado_at: null,
    cancelado_at: null,
    metadata: { should_not_leak: true },
    ...overrides,
  };
}

function makeFetch({ authId, profile, services = [], failPath = null }) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
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
      return response(rows.slice(0, Number(parsed.searchParams.get("limit") || 2)));
    }
    return response({}, 404);
  };
  return { fetchImpl, calls };
}

test("servicio existente: cliente obtiene sólo el servicio autorizado", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_ID,
    profile: { id: CLIENT_ID, tipo: "cliente", activo: true },
    services: [service()],
  });

  const result = await getCurrentJob(
    { userId: CLIENT_ID, role: "client", serviceId: SERVICE_A },
    { env: baseEnv, fetchImpl }
  );

  assert.equal(result.status, "ok");
  assert.equal(result.service.id, SERVICE_A);
  assert.equal(result.service.estado, "en_progreso");
  assert.equal("metadata" in result.service, false);
});

test("usuario sin servicio activo devuelve none como resultado válido", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_ID,
    profile: { id: CLIENT_ID, tipo: "cliente", activo: true },
    services: [],
  });

  const result = await getCurrentJob(
    { userId: CLIENT_ID, role: "client" },
    { env: baseEnv, fetchImpl }
  );

  assert.deepEqual(result, {
    status: "none",
    role: "client",
    user_id: CLIENT_ID,
    service: null,
  });
});

test("usuario solicitado debe coincidir con la identidad autenticada", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: PROVIDER_ID,
    profile: { id: PROVIDER_ID, tipo: "proveedor", activo: true },
    services: [service()],
  });

  const result = await getCurrentJob(
    { userId: CLIENT_ID, role: "client", serviceId: SERVICE_A },
    { env: baseEnv, fetchImpl }
  );

  assert.equal(result.status, "unauthorized");
  assert.equal(result.reason, "authenticated_user_mismatch");
  assert.equal(calls.some((url) => url.includes("/rest/v1/servicios")), false);
});

test("aislamiento por serviceId: nunca elige otro servicio cuando se pide uno exacto", async () => {
  const second = service({ id: SERVICE_B, numero: 51, descripcion: "Otro trabajo" });
  const { fetchImpl, calls } = makeFetch({
    authId: CLIENT_ID,
    profile: { id: CLIENT_ID, tipo: "cliente", activo: true },
    services: [second, service()],
  });

  const result = await getCurrentJob(
    { userId: CLIENT_ID, role: "client", serviceId: SERVICE_B },
    { env: baseEnv, fetchImpl }
  );

  assert.equal(result.status, "ok");
  assert.equal(result.service.id, SERVICE_B);
  const serviceUrl = new URL(calls.find((url) => url.includes("/rest/v1/servicios")));
  assert.equal(serviceUrl.searchParams.get("id"), `eq.${SERVICE_B}`);
  assert.equal(serviceUrl.searchParams.get("cliente_id"), `eq.${CLIENT_ID}`);
});

test("cliente y proveedor usan filtros de ownership diferentes y rol real", async () => {
  const clientFetch = makeFetch({
    authId: CLIENT_ID,
    profile: { id: CLIENT_ID, tipo: "cliente", activo: true },
    services: [service()],
  });
  const providerFetch = makeFetch({
    authId: PROVIDER_ID,
    profile: { id: PROVIDER_ID, tipo: "proveedor", activo: true },
    services: [service()],
  });

  const clientResult = await getCurrentJob(
    { userId: CLIENT_ID, role: "client", serviceId: SERVICE_A },
    { env: baseEnv, fetchImpl: clientFetch.fetchImpl }
  );
  const providerResult = await getCurrentJob(
    { userId: PROVIDER_ID, role: "provider", serviceId: SERVICE_A },
    { env: baseEnv, fetchImpl: providerFetch.fetchImpl }
  );

  assert.equal(clientResult.status, "ok");
  assert.equal(providerResult.status, "ok");
  assert.ok(
    new URL(clientFetch.calls.find((url) => url.includes("/rest/v1/servicios")))
      .searchParams.has("cliente_id")
  );
  assert.ok(
    new URL(providerFetch.calls.find((url) => url.includes("/rest/v1/servicios")))
      .searchParams.has("proveedor_id")
  );
});

test("rol declarado debe coincidir con el perfil real", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: CLIENT_ID,
    profile: { id: CLIENT_ID, tipo: "cliente", activo: true },
    services: [service()],
  });

  const result = await getCurrentJob(
    { userId: CLIENT_ID, role: "provider", serviceId: SERVICE_A },
    { env: baseEnv, fetchImpl }
  );

  assert.equal(result.status, "unauthorized");
  assert.equal(result.reason, "role_or_account_mismatch");
  assert.equal(calls.some((url) => url.includes("/rest/v1/servicios")), false);
});

test("más de un servicio activo no se resuelve por una variable global", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_ID,
    profile: { id: CLIENT_ID, tipo: "cliente", activo: true },
    services: [service(), service({ id: SERVICE_B, numero: 51 })],
  });

  const result = await getCurrentJob(
    { userId: CLIENT_ID, role: "client" },
    { env: baseEnv, fetchImpl }
  );

  assert.equal(result.status, "ambiguous");
  assert.equal(result.reason, "multiple_active_services_require_service_id");
  assert.deepEqual(
    result.candidates.map((row) => row.service_id),
    [SERVICE_A, SERVICE_B]
  );
});

test("error de backend se devuelve como error controlado", async () => {
  const { fetchImpl } = makeFetch({
    authId: CLIENT_ID,
    profile: { id: CLIENT_ID, tipo: "cliente", activo: true },
    services: [service()],
    failPath: "/rest/v1/servicios",
  });

  await assert.rejects(
    () =>
      getCurrentJob(
        { userId: CLIENT_ID, role: "client", serviceId: SERVICE_A },
        { env: baseEnv, fetchImpl }
      ),
    (error) => error?.code === "backend_error" && error?.status === 503
  );
});

test("parámetros inválidos son rechazados antes de contactar el backend", () => {
  assert.throws(
    () => validateCurrentJobInput({ userId: "not-a-uuid", role: "client" }),
    (error) => error?.code === "invalid_input"
  );
  assert.throws(
    () => validateCurrentJobInput({ userId: CLIENT_ID, role: "admin" }),
    (error) => error?.code === "invalid_input"
  );
});

test("configuración puede fijar el project ref esperado y rechazar UGO Arena", () => {
  assert.equal(loadRuntimeConfig(baseEnv).projectRef, "trfsjuseqjxlhrxuvdsm");
  assert.throws(
    () =>
      loadRuntimeConfig({
        ...baseEnv,
        UGO_MCP_SUPABASE_URL: "https://tmossnqfwfwjrtzwcbmm.supabase.co",
      }),
    (error) => error?.code === "wrong_project"
  );
});
