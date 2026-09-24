import test from "node:test";
import assert from "node:assert/strict";
import { markArrived, validateArrivalInput } from "../src/arrival.js";

const PROVIDER_A = "22222222-2222-4222-8222-222222222222";
const PROVIDER_B = "22222222-2222-4222-8222-333333333333";
const CLIENT_A = "11111111-1111-4111-8111-111111111111";
const SERVICE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SERVICE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

function makeFetch({
  authId = PROVIDER_A,
  profile = { id: PROVIDER_A, tipo: "proveedor", activo: true },
  services = [{ id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "en_camino" }],
  arrival = {
    status: "arrived",
    service_id: SERVICE_A,
    previous_state: "en_camino",
    state: "llegado",
    distance_m: 120,
    location_age_ms: 2500,
    idempotent: false,
  },
  failRpc = false,
}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const parsed = new URL(String(url));

    if (parsed.pathname === "/auth/v1/user") return response({ id: authId });
    if (parsed.pathname === "/rest/v1/usuarios") return response(profile ? [profile] : []);

    if (parsed.pathname === "/rest/v1/servicios") {
      const id = parsed.searchParams.get("id")?.replace(/^eq\./, "");
      const provider = parsed.searchParams.get("proveedor_id")?.replace(/^eq\./, "");
      const rows = services.filter((row) => {
        if (id && row.id !== id) return false;
        if (provider && row.proveedor_id !== provider) return false;
        return true;
      });
      return response(rows.slice(0, 1));
    }

    if (parsed.pathname === "/rest/v1/rpc/marcar_llegada_proveedor") {
      if (failRpc) return response({ message: "backend failed" }, 503);
      return response(arrival);
    }

    return response({}, 404);
  };
  return { fetchImpl, calls };
}

test("ugo_mark_arrived: backend-confirmed arrival is returned without model GPS fields", async () => {
  const { fetchImpl, calls } = makeFetch({});
  const result = await markArrived(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env, fetchImpl }
  );

  assert.equal(result.status, "arrived");
  assert.equal(result.state, "llegado");
  assert.equal(result.distance_m, 120);

  const rpc = calls.find(({ url }) => url.includes("/rpc/marcar_llegada_proveedor"));
  assert.ok(rpc);
  assert.deepEqual(JSON.parse(String(rpc.options.body)), { p_servicio_id: SERVICE_A });
});

test("ugo_mark_arrived: exactly 200m remains a backend success", async () => {
  const { fetchImpl } = makeFetch({
    arrival: {
      status: "arrived",
      service_id: SERVICE_A,
      previous_state: "en_camino",
      state: "llegado",
      distance_m: 200,
      location_age_ms: 1000,
      idempotent: false,
    },
  });
  const result = await markArrived(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env, fetchImpl }
  );
  assert.equal(result.status, "arrived");
  assert.equal(result.distance_m, 200);
});

test("ugo_mark_arrived: outside geofence is preserved as rejected and never rewritten as success", async () => {
  const { fetchImpl } = makeFetch({
    arrival: {
      status: "rejected",
      code: "outside_geofence",
      service_id: SERVICE_A,
      state: "en_camino",
      distance_m: 201,
      location_age_ms: 1200,
    },
  });
  const result = await markArrived(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env, fetchImpl }
  );
  assert.deepEqual(result, {
    status: "rejected",
    code: "outside_geofence",
    service_id: SERVICE_A,
    state: "en_camino",
    distance_m: 201,
    location_age_ms: 1200,
  });
});

for (const code of [
  "gps_stale",
  "gps_unavailable",
  "gps_inaccurate",
  "client_location_unavailable",
  "invalid_state",
]) {
  test(`ugo_mark_arrived: ${code} remains a controlled rejection`, async () => {
    const { fetchImpl } = makeFetch({
      arrival: {
        status: "rejected",
        code,
        service_id: SERVICE_A,
        state: "en_camino",
        distance_m: null,
      },
    });
    const result = await markArrived(
      { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
      { env, fetchImpl }
    );
    assert.equal(result.status, "rejected");
    assert.equal(result.code, code);
  });
}

test("ugo_mark_arrived: duplicate command is idempotent when backend says already arrived", async () => {
  const { fetchImpl } = makeFetch({
    services: [{ id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "llegado" }],
    arrival: {
      status: "arrived",
      service_id: SERVICE_A,
      previous_state: "llegado",
      state: "llegado",
      distance_m: null,
      location_age_ms: null,
      idempotent: true,
    },
  });
  const result = await markArrived(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env, fetchImpl }
  );
  assert.equal(result.status, "arrived");
  assert.equal(result.idempotent, true);
});

test("ugo_mark_arrived: authenticated user cannot impersonate another provider", async () => {
  const { fetchImpl, calls } = makeFetch({ authId: PROVIDER_B });
  const result = await markArrived(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env, fetchImpl }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unauthorized");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/marcar_llegada_proveedor")), false);
});

test("ugo_mark_arrived: provider cannot target another provider service", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [{ id: SERVICE_B, proveedor_id: PROVIDER_B, estado: "en_camino" }],
  });
  const result = await markArrived(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_B },
    { env, fetchImpl }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unauthorized");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/marcar_llegada_proveedor")), false);
});

test("ugo_mark_arrived: service A never calls backend with service B", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [
      { id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "en_camino" },
      { id: SERVICE_B, proveedor_id: PROVIDER_A, estado: "en_camino" },
    ],
  });
  await markArrived(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env, fetchImpl }
  );
  const rpc = calls.find(({ url }) => url.includes("/rpc/marcar_llegada_proveedor"));
  assert.deepEqual(JSON.parse(String(rpc.options.body)), { p_servicio_id: SERVICE_A });
});

test("ugo_mark_arrived: client role and missing serviceId are rejected before backend mutation", () => {
  assert.throws(
    () => validateArrivalInput({ userId: CLIENT_A, role: "client", serviceId: SERVICE_A }),
    (error) => error?.code === "invalid_input"
  );
  assert.throws(
    () => validateArrivalInput({ userId: PROVIDER_A, role: "provider" }),
    (error) => error?.code === "invalid_input"
  );
});

test("ugo_mark_arrived: backend error is surfaced as controlled MCP error", async () => {
  const { fetchImpl } = makeFetch({ failRpc: true });
  await assert.rejects(
    () =>
      markArrived(
        { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
        { env, fetchImpl }
      ),
    (error) => error?.code === "backend_error" && error?.status === 503
  );
});


test("ugo_mark_arrived: backend response for another serviceId is rejected", async () => {
  const { fetchImpl } = makeFetch({
    arrival: {
      status: "arrived",
      service_id: SERVICE_B,
      previous_state: "en_camino",
      state: "llegado",
      distance_m: 100,
      location_age_ms: 1000,
      idempotent: false,
    },
  });

  await assert.rejects(
    () =>
      markArrived(
        { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
        { env, fetchImpl }
      ),
    (error) => error?.code === "arrival_scope_mismatch"
  );
});

test("ugo_mark_arrived: arrived response must confirm state llegado", async () => {
  const { fetchImpl } = makeFetch({
    arrival: {
      status: "arrived",
      service_id: SERVICE_A,
      previous_state: "en_camino",
      state: "en_camino",
      distance_m: 100,
      location_age_ms: 1000,
      idempotent: false,
    },
  });

  await assert.rejects(
    () =>
      markArrived(
        { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
        { env, fetchImpl }
      ),
    (error) => error?.code === "backend_invalid_response"
  );
});
