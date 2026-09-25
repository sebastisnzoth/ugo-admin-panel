import test from "node:test";
import assert from "node:assert/strict";
import {
  finishWork,
  validateFinishWorkInput,
} from "../src/finishWork.js";

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
    { id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "en_progreso" },
  ],
  rpcResponse = {
    id: SERVICE_A,
    proveedor_id: PROVIDER_A,
    estado: "esperando_aprobacion",
  },
  rpcStatus = 200,
  rpcMessage = null,
  rpcThrows = false,
  commitStateOnFailure = null,
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
      if (commitStateOnFailure) {
        services.splice(0, services.length, {
          id: SERVICE_A,
          proveedor_id: PROVIDER_A,
          estado: commitStateOnFailure,
        });
      }

      if (rpcThrows) {
        throw new Error("network lost after commit");
      }

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

function rpcCalls(calls) {
  return calls.filter(({ url }) => url.includes("/rpc/avanzar_servicio"));
}

test("ugo_finish_work: provider válido finaliza en_progreso -> esperando_aprobacion por RPC canónico", async () => {
  const { fetchImpl, calls } = makeFetch({});

  const result = await finishWork(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.deepEqual(result, {
    status: "finished_work",
    service_id: SERVICE_A,
    state: "esperando_aprobacion",
    idempotent: false,
    reconciled: false,
  });

  assert.equal(rpcCalls(calls).length, 1);
  assert.deepEqual(JSON.parse(String(rpcCalls(calls)[0].options.body)), {
    p_servicio_id: SERVICE_A,
    p_estado: "esperando_aprobacion",
  });
});

test("ugo_finish_work: auth.uid distinto no llega al RPC", async () => {
  const { fetchImpl, calls } = makeFetch({ authId: PROVIDER_B });

  const result = await finishWork(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unauthorized");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_finish_work: client role se rechaza antes del backend", () => {
  assert.throws(
    () =>
      validateFinishWorkInput({
        userId: CLIENT_A,
        role: "client",
        serviceId: SERVICE_A,
      }),
    (error) => error?.code === "invalid_input"
  );
});

for (const extra of [
  { storage_path: "fake/after.jpg" },
  { photo: "fake" },
  { evidence: { fake: true } },
]) {
  test(`ugo_finish_work: rechaza input extra ${Object.keys(extra)[0]}`, () => {
    assert.throws(
      () =>
        validateFinishWorkInput({
          userId: PROVIDER_A,
          role: "provider",
          serviceId: SERVICE_A,
          ...extra,
        }),
      (error) => error?.code === "invalid_input"
    );
  });
}

test("ugo_finish_work: servicio de otro proveedor queda oculto y no muta", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [
      { id: SERVICE_A, proveedor_id: PROVIDER_B, estado: "en_progreso" },
    ],
  });

  const result = await finishWork(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "not_found_or_unauthorized");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_finish_work: serviceId inexistente se rechaza sin filtrar existencia", async () => {
  const { fetchImpl, calls } = makeFetch({ services: [] });

  const result = await finishWork(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "not_found_or_unauthorized");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_finish_work: ya esperando_aprobacion es idempotente y no repite RPC", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [
      { id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "esperando_aprobacion" },
    ],
  });

  const result = await finishWork(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "finished_work");
  assert.equal(result.state, "esperando_aprobacion");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, false);
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_finish_work: completado se informa already_advanced sin retroceder", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [
      { id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "completado" },
    ],
  });

  const result = await finishWork(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "already_advanced");
  assert.equal(result.state, "completado");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, false);
  assert.equal(rpcCalls(calls).length, 0);
});

for (const state of [
  "borrador",
  "buscando",
  "ofrecido",
  "asignado",
  "en_camino",
  "llegado",
  "cancelado",
  "disputado",
]) {
  test(`ugo_finish_work: estado ${state} se rechaza sin mutar`, async () => {
    const { fetchImpl, calls } = makeFetch({
      services: [
        { id: SERVICE_A, proveedor_id: PROVIDER_A, estado: state },
      ],
    });

    const result = await finishWork(
      { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
      { env: testEnv, fetchImpl }
    );

    assert.equal(result.status, "rejected");
    assert.equal(result.code, "invalid_state");
    assert.equal(result.state, state);
    assert.equal(rpcCalls(calls).length, 0);
  });
}

test("ugo_finish_work: conserva rechazo exacto por falta de evidencia final", async () => {
  const message = "Agregá al menos una foto final antes de pedir aprobación";
  const { fetchImpl } = makeFetch({
    rpcStatus: 400,
    rpcMessage: message,
  });

  await assert.rejects(
    () =>
      finishWork(
        { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) =>
      error?.code === "backend_rejected" &&
      error?.status === 400 &&
      error?.message === message
  );
});

test("ugo_finish_work: fallo de red después de commit a esperando_aprobacion se reconcilia", async () => {
  const { fetchImpl } = makeFetch({
    rpcThrows: true,
    commitStateOnFailure: "esperando_aprobacion",
  });

  const result = await finishWork(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "finished_work");
  assert.equal(result.state, "esperando_aprobacion");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, true);
});

test("ugo_finish_work: fallo ambiguo con servicio ya completado se reconcilia sin retroceder", async () => {
  const { fetchImpl } = makeFetch({
    rpcThrows: true,
    commitStateOnFailure: "completado",
  });

  const result = await finishWork(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "already_advanced");
  assert.equal(result.state, "completado");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, true);
});

test("ugo_finish_work: respuesta backend para otro serviceId se rechaza scope_mismatch", async () => {
  const { fetchImpl } = makeFetch({
    rpcResponse: {
      id: SERVICE_B,
      proveedor_id: PROVIDER_A,
      estado: "esperando_aprobacion",
    },
  });

  await assert.rejects(
    () =>
      finishWork(
        { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) => error?.code === "scope_mismatch"
  );
});

test("ugo_finish_work: respuesta backend para otro proveedor se rechaza scope_mismatch", async () => {
  const { fetchImpl } = makeFetch({
    rpcResponse: {
      id: SERVICE_A,
      proveedor_id: PROVIDER_B,
      estado: "esperando_aprobacion",
    },
  });

  await assert.rejects(
    () =>
      finishWork(
        { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) => error?.code === "scope_mismatch"
  );
});

test("ugo_finish_work: siempre envía esperando_aprobacion y el serviceId solicitado", async () => {
  const { fetchImpl, calls } = makeFetch({});

  await finishWork(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(rpcCalls(calls).length, 1);
  assert.deepEqual(JSON.parse(String(rpcCalls(calls)[0].options.body)), {
    p_servicio_id: SERVICE_A,
    p_estado: "esperando_aprobacion",
  });
});

test("ugo_finish_work: PROD queda bloqueado antes de mutar", async () => {
  const { fetchImpl, calls } = makeFetch({});

  await assert.rejects(
    () =>
      finishWork(
        { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A },
        { env: prodEnv, fetchImpl }
      ),
    (error) =>
      error?.code === "backend_contract_not_ready" &&
      error?.status === 409
  );

  assert.equal(rpcCalls(calls).length, 0);
});
