import test from "node:test";
import assert from "node:assert/strict";
import {
  startRoute,
  validateStartRouteInput,
} from "../src/startRoute.js";

const PROVIDER_A = "22222222-2222-4222-8222-222222222222";
const PROVIDER_B = "22222222-2222-4222-8222-333333333333";
const CLIENT_A = "11111111-1111-4111-8111-111111111111";
const SERVICE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SERVICE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const testEnv = {
  UGO_MCP_SUPABASE_URL: "https://tmossnqfwfwjrtzwcbmm.supabase.co",
  UGO_MCP_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
  UGO_MCP_USER_ACCESS_TOKEN: "user-session-token",
  UGO_MCP_EXPECTED_PROJECT_REF: "tmossnqfwfwjrtzwcbmm",
};

const prodEnv = {
  ...testEnv,
  UGO_MCP_SUPABASE_URL: "https://trfsjuseqjxlhrxuvdsm.supabase.co",
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
  services = [
    { id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "asignado" },
  ],
  rpcResponse = {
    id: SERVICE_A,
    proveedor_id: PROVIDER_A,
    estado: "en_camino",
  },
  rpcStatus = 200,
  rpcMessage = null,
  rpcThrows = false,
  commitBeforeFailure = false,
}) {
  const calls = [];

  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const parsed = new URL(String(url));

    if (parsed.pathname === "/auth/v1/user") {
      return response({ id: authId });
    }
    if (parsed.pathname === "/rest/v1/usuarios") {
      return response(profile ? [profile] : []);
    }
    if (parsed.pathname === "/rest/v1/servicios") {
      const id = parsed.searchParams.get("id")?.replace(/^eq\./, "");
      const provider = parsed.searchParams
        .get("proveedor_id")
        ?.replace(/^eq\./, "");
      return response(
        services
          .filter(
            (row) =>
              (!id || row.id === id) &&
              (!provider || row.proveedor_id === provider)
          )
          .slice(0, 1)
      );
    }
    if (parsed.pathname === "/rest/v1/rpc/avanzar_servicio") {
      if (commitBeforeFailure) {
        services.splice(0, services.length, {
          id: SERVICE_A,
          proveedor_id: PROVIDER_A,
          estado: "en_camino",
        });
      }
      if (rpcThrows) throw new Error("network lost after commit");
      if (rpcStatus >= 400) {
        return response(
          { message: rpcMessage || "Transición rechazada por backend" },
          rpcStatus
        );
      }
      return response(rpcResponse, rpcStatus);
    }

    return response({}, 404);
  };

  return { fetchImpl, calls, services };
}

test("ugo_start_route: provider válido inicia asignado -> en_camino por RPC canónico", async () => {
  const { fetchImpl, calls } = makeFetch({});
  const result = await startRoute(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.deepEqual(result, {
    status: "started_route",
    service_id: SERVICE_A,
    state: "en_camino",
    idempotent: false,
    reconciled: false,
  });

  const rpc = calls.find(({ url }) => url.includes("/rpc/avanzar_servicio"));
  assert.ok(rpc);
  assert.deepEqual(JSON.parse(String(rpc.options.body)), {
    p_servicio_id: SERVICE_A,
    p_estado: "en_camino",
  });
});

test("ugo_start_route: auth.uid distinto no llega al RPC", async () => {
  const { fetchImpl, calls } = makeFetch({ authId: PROVIDER_B });
  const result = await startRoute(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unauthorized");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/avanzar_servicio")), false);
});

test("ugo_start_route: client role se rechaza antes del backend", () => {
  assert.throws(
    () =>
      validateStartRouteInput({
        userId: CLIENT_A,
        role: "client",
        serviceId: SERVICE_A,
      }),
    (error) => error?.code === "invalid_input"
  );
});

test("ugo_start_route: servicio de otro proveedor queda oculto y no muta", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [
      { id: SERVICE_A, proveedor_id: PROVIDER_B, estado: "asignado" },
    ],
  });
  const result = await startRoute(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "not_found_or_unauthorized");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/avanzar_servicio")), false);
});

test("ugo_start_route: serviceId inexistente se rechaza sin filtrar existencia", async () => {
  const { fetchImpl, calls } = makeFetch({ services: [] });
  const result = await startRoute(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "not_found_or_unauthorized");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/avanzar_servicio")), false);
});

test("ugo_start_route: ya en_camino es idempotente y no repite el RPC", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [
      { id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "en_camino" },
    ],
  });
  const result = await startRoute(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "started_route");
  assert.equal(result.state, "en_camino");
  assert.equal(result.idempotent, true);
  assert.equal(calls.some(({ url }) => url.includes("/rpc/avanzar_servicio")), false);
});

for (const state of ["llegado", "en_progreso", "esperando_aprobacion", "completado"]) {
  test(`ugo_start_route: ${state} nunca retrocede a en_camino`, async () => {
    const { fetchImpl, calls } = makeFetch({
      services: [
        { id: SERVICE_A, proveedor_id: PROVIDER_A, estado: state },
      ],
    });
    const result = await startRoute(
      { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
      { env: testEnv, fetchImpl }
    );
    assert.equal(result.status, "already_advanced");
    assert.equal(result.state, state);
    assert.equal(result.idempotent, true);
    assert.equal(calls.some(({ url }) => url.includes("/rpc/avanzar_servicio")), false);
  });
}

for (const [label, message] of [
  [
    "trabajo programado demasiado temprano",
    "Este trabajo todavía está programado para más adelante. Podés iniciar el traslado hasta 60 minutos antes.",
  ],
  [
    "pago no confirmado",
    "El cliente todavía no confirmó una forma de pago habilitada",
  ],
]) {
  test(`ugo_start_route: conserva rechazo real por ${label}`, async () => {
    const { fetchImpl } = makeFetch({
      rpcStatus: 400,
      rpcMessage: message,
    });
    await assert.rejects(
      () =>
        startRoute(
          { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
          { env: testEnv, fetchImpl }
        ),
      (error) =>
        error?.code === "backend_rejected" &&
        error?.status === 400 &&
        error?.message === message
    );
  });
}

test("ugo_start_route: fallo de red después de commit se reconcilia", async () => {
  const { fetchImpl } = makeFetch({
    rpcThrows: true,
    commitBeforeFailure: true,
  });
  const result = await startRoute(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "started_route");
  assert.equal(result.state, "en_camino");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, true);
});

test("ugo_start_route: respuesta backend para otro serviceId se rechaza", async () => {
  const { fetchImpl } = makeFetch({
    rpcResponse: {
      id: SERVICE_B,
      proveedor_id: PROVIDER_A,
      estado: "en_camino",
    },
  });
  await assert.rejects(
    () =>
      startRoute(
        { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) => error?.code === "route_scope_mismatch"
  );
});

test("ugo_start_route: nunca llama RPC con serviceId distinto del solicitado", async () => {
  const { fetchImpl, calls } = makeFetch({});
  await startRoute(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );
  const rpc = calls.find(({ url }) => url.includes("/rpc/avanzar_servicio"));
  assert.deepEqual(JSON.parse(String(rpc.options.body)), {
    p_servicio_id: SERVICE_A,
    p_estado: "en_camino",
  });
});

test("ugo_start_route: PROD queda bloqueado antes de mutar", async () => {
  const { fetchImpl, calls } = makeFetch({});
  await assert.rejects(
    () =>
      startRoute(
        { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
        { env: prodEnv, fetchImpl }
      ),
    (error) =>
      error?.code === "backend_contract_not_ready" &&
      error?.status === 409
  );
  assert.equal(calls.some(({ url }) => url.includes("/rpc/avanzar_servicio")), false);
});

for (const state of ["cancelado", "disputado", "buscando", "ofrecido"]) {
  test(`ugo_start_route: estado ${state} se rechaza sin mutar`, async () => {
    const { fetchImpl, calls } = makeFetch({
      services: [
        { id: SERVICE_A, proveedor_id: PROVIDER_A, estado: state },
      ],
    });
    const result = await startRoute(
      { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
      { env: testEnv, fetchImpl }
    );
    assert.equal(result.status, "rejected");
    assert.equal(result.code, "invalid_state");
    assert.equal(calls.some(({ url }) => url.includes("/rpc/avanzar_servicio")), false);
  });
}
