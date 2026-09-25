import test from "node:test";
import assert from "node:assert/strict";
import {
  approveWork,
  validateApproveWorkInput,
} from "../src/approveWork.js";

const CLIENT_A = "11111111-1111-4111-8111-111111111111";
const CLIENT_B = "11111111-1111-4111-8111-222222222222";
const PROVIDER_A = "22222222-2222-4222-8222-222222222222";
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
  authId = CLIENT_A,
  profile = { id: CLIENT_A, tipo: "cliente", activo: true },
  services = [
    { id: SERVICE_A, cliente_id: CLIENT_A, estado: "esperando_aprobacion", metadata: {} },
  ],
  rpcResponse = {
    id: SERVICE_A,
    cliente_id: CLIENT_A,
    estado: "completado",
    metadata: { trabajo_aprobado_at: "2026-09-25T05:00:00Z" },
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
      const client = parsed.searchParams
        .get("cliente_id")
        ?.replace(/^eq\./, "");

      return response(
        services
          .filter(
            (row) =>
              (!id || row.id === id) &&
              (!client || row.cliente_id === client)
          )
          .slice(0, 1)
      );
    }

    if (parsed.pathname === "/rest/v1/rpc/aprobar_servicio") {
      if (commitStateOnFailure) {
        services.splice(0, services.length, {
          id: SERVICE_A,
          cliente_id: CLIENT_A,
          estado: commitStateOnFailure.estado,
          metadata: commitStateOnFailure.metadata || {},
        });
      }

      if (rpcThrows) {
        throw new Error("network lost after commit");
      }

      if (rpcStatus >= 400) {
        return response(
          { message: rpcMessage || "Aprobación rechazada por backend" },
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
  return calls.filter(({ url }) => url.includes("/rpc/aprobar_servicio"));
}

test("ugo_approve_work: aprobación electrónica completa el servicio por RPC canónico", async () => {
  const { fetchImpl, calls } = makeFetch({});

  const result = await approveWork(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.deepEqual(result, {
    status: "approved_work",
    service_id: SERVICE_A,
    state: "completado",
    requires_cash_confirmation: false,
    idempotent: false,
    reconciled: false,
  });

  assert.equal(rpcCalls(calls).length, 1);
  assert.deepEqual(JSON.parse(String(rpcCalls(calls)[0].options.body)), {
    p_servicio_id: SERVICE_A,
  });
});

test("ugo_approve_work: efectivo aprueba trabajo pero conserva esperando_aprobacion para YA PAGUÉ", async () => {
  const { fetchImpl, calls } = makeFetch({
    rpcResponse: {
      id: SERVICE_A,
      cliente_id: CLIENT_A,
      estado: "esperando_aprobacion",
      metadata: { trabajo_aprobado_at: "2026-09-25T05:00:00Z" },
    },
  });

  const result = await approveWork(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "approved_work");
  assert.equal(result.state, "esperando_aprobacion");
  assert.equal(result.requires_cash_confirmation, true);
  assert.equal(result.idempotent, false);
  assert.equal(rpcCalls(calls).length, 1);
});

test("ugo_approve_work: auth.uid distinto no llega al RPC", async () => {
  const { fetchImpl, calls } = makeFetch({ authId: CLIENT_B });

  const result = await approveWork(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unauthorized");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_approve_work: provider role se rechaza antes del backend", () => {
  assert.throws(
    () =>
      validateApproveWorkInput({
        userId: PROVIDER_A,
        role: "provider",
        serviceId: SERVICE_A,
      }),
    (error) => error?.code === "invalid_input"
  );
});

for (const extra of [
  { payment: "cash" },
  { paymentId: "fake-payment" },
  { paymentMethod: "cash" },
  { providerId: PROVIDER_A },
  { paid: true },
  { evidence: { fake: true } },
  { rating: 5 },
  { metadata: { trabajo_aprobado_at: "fake" } },
]) {
  test(`ugo_approve_work: rechaza input extra ${Object.keys(extra)[0]}`, () => {
    assert.throws(
      () =>
        validateApproveWorkInput({
          userId: CLIENT_A,
          role: "client",
          serviceId: SERVICE_A,
          ...extra,
        }),
      (error) => error?.code === "invalid_input"
    );
  });
}

test("ugo_approve_work: servicio de otro cliente queda oculto y no muta", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [
      { id: SERVICE_A, cliente_id: CLIENT_B, estado: "esperando_aprobacion", metadata: {} },
    ],
  });

  const result = await approveWork(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "not_found_or_unauthorized");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_approve_work: serviceId inexistente se rechaza de forma segura y no muta", async () => {
  const { fetchImpl, calls } = makeFetch({ services: [] });

  const result = await approveWork(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "not_found_or_unauthorized");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_approve_work: efectivo ya aprobado es idempotente y no repite RPC", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [
      {
        id: SERVICE_A,
        cliente_id: CLIENT_A,
        estado: "esperando_aprobacion",
        metadata: { trabajo_aprobado_at: "2026-09-25T05:00:00Z" },
      },
    ],
  });

  const result = await approveWork(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "approved_work");
  assert.equal(result.state, "esperando_aprobacion");
  assert.equal(result.requires_cash_confirmation, true);
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, false);
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_approve_work: servicio completado no retrocede ni repite RPC", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [
      { id: SERVICE_A, cliente_id: CLIENT_A, estado: "completado", metadata: {} },
    ],
  });

  const result = await approveWork(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "already_advanced");
  assert.equal(result.state, "completado");
  assert.equal(result.idempotent, true);
  assert.equal(result.requires_cash_confirmation, false);
  assert.equal(rpcCalls(calls).length, 0);
});

for (const state of [
  "borrador",
  "buscando",
  "ofrecido",
  "asignado",
  "en_camino",
  "llegado",
  "en_progreso",
  "cancelado",
  "disputado",
]) {
  test(`ugo_approve_work: estado ${state} se rechaza sin mutar`, async () => {
    const { fetchImpl, calls } = makeFetch({
      services: [
        { id: SERVICE_A, cliente_id: CLIENT_A, estado: state, metadata: {} },
      ],
    });

    const result = await approveWork(
      { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
      { env: testEnv, fetchImpl }
    );

    assert.equal(result.status, "rejected");
    assert.equal(result.code, "invalid_state");
    assert.equal(result.state, state);
    assert.equal(rpcCalls(calls).length, 0);
  });
}

test("ugo_approve_work: conserva rechazo exacto por falta de evidencia final", async () => {
  const message = "Falta la evidencia final del proveedor";
  const { fetchImpl } = makeFetch({
    rpcStatus: 400,
    rpcMessage: message,
  });

  await assert.rejects(
    () =>
      approveWork(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) =>
      error?.code === "backend_rejected" &&
      error?.status === 400 &&
      error?.message === message
  );
});

test("ugo_approve_work: conserva rechazo exacto si falta forma de pago confirmada", async () => {
  const message = "El servicio todavía no tiene una forma de pago confirmada";
  const { fetchImpl } = makeFetch({
    rpcStatus: 400,
    rpcMessage: message,
  });

  await assert.rejects(
    () =>
      approveWork(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) =>
      error?.code === "backend_rejected" &&
      error?.status === 400 &&
      error?.message === message
  );
});

test("ugo_approve_work: conserva rechazo exacto si el efectivo está en estado inválido", async () => {
  const message = "El pago en efectivo no está en un estado válido";
  const { fetchImpl } = makeFetch({
    rpcStatus: 400,
    rpcMessage: message,
  });

  await assert.rejects(
    () =>
      approveWork(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) =>
      error?.code === "backend_rejected" &&
      error?.status === 400 &&
      error?.message === message
  );
});

test("ugo_approve_work: conserva rechazo exacto si el pago electrónico no está protegido", async () => {
  const message = "El pago todavía no está confirmado y protegido";
  const { fetchImpl } = makeFetch({
    rpcStatus: 400,
    rpcMessage: message,
  });

  await assert.rejects(
    () =>
      approveWork(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) => error?.code === "backend_rejected" && error?.message === message
  );
});

test("ugo_approve_work: fallo de red después de cierre electrónico se reconcilia", async () => {
  const { fetchImpl } = makeFetch({
    rpcThrows: true,
    commitStateOnFailure: {
      estado: "completado",
      metadata: { trabajo_aprobado_at: "2026-09-25T05:00:00Z" },
    },
  });

  const result = await approveWork(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "approved_work");
  assert.equal(result.state, "completado");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, true);
  assert.equal(result.requires_cash_confirmation, false);
});

test("ugo_approve_work: fallo de red después de aprobación cash se reconcilia sin cerrar", async () => {
  const { fetchImpl } = makeFetch({
    rpcThrows: true,
    commitStateOnFailure: {
      estado: "esperando_aprobacion",
      metadata: { trabajo_aprobado_at: "2026-09-25T05:00:00Z" },
    },
  });

  const result = await approveWork(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "approved_work");
  assert.equal(result.state, "esperando_aprobacion");
  assert.equal(result.requires_cash_confirmation, true);
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, true);
});

test("ugo_approve_work: fallo de red sin commit no afirma éxito y conserva error original", async () => {
  const { fetchImpl } = makeFetch({
    rpcThrows: true,
  });

  await assert.rejects(
    () =>
      approveWork(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) =>
      error?.code === "backend_unavailable" &&
      error?.status === 503
  );
});

test("ugo_approve_work: waiting sin trabajo_aprobado_at es respuesta backend inválida", async () => {
  const { fetchImpl } = makeFetch({
    rpcResponse: {
      id: SERVICE_A,
      cliente_id: CLIENT_A,
      estado: "esperando_aprobacion",
      metadata: {},
    },
  });

  await assert.rejects(
    () =>
      approveWork(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) => error?.code === "backend_invalid_response"
  );
});

test("ugo_approve_work: respuesta backend para otro serviceId se rechaza scope_mismatch", async () => {
  const { fetchImpl } = makeFetch({
    rpcResponse: {
      id: SERVICE_B,
      cliente_id: CLIENT_A,
      estado: "completado",
      metadata: { trabajo_aprobado_at: "2026-09-25T05:00:00Z" },
    },
  });

  await assert.rejects(
    () =>
      approveWork(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) => error?.code === "scope_mismatch"
  );
});

test("ugo_approve_work: respuesta backend para otro cliente se rechaza scope_mismatch", async () => {
  const { fetchImpl } = makeFetch({
    rpcResponse: {
      id: SERVICE_A,
      cliente_id: CLIENT_B,
      estado: "completado",
      metadata: { trabajo_aprobado_at: "2026-09-25T05:00:00Z" },
    },
  });

  await assert.rejects(
    () =>
      approveWork(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) => error?.code === "scope_mismatch"
  );
});

test("ugo_approve_work: PROD queda bloqueado antes de mutar", async () => {
  const { fetchImpl, calls } = makeFetch({});

  await assert.rejects(
    () =>
      approveWork(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: prodEnv, fetchImpl }
      ),
    (error) =>
      error?.code === "backend_contract_not_ready" &&
      error?.status === 409
  );

  assert.equal(rpcCalls(calls).length, 0);
});
