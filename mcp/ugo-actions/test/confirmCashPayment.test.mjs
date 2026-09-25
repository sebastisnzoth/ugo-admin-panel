import test from "node:test";
import assert from "node:assert/strict";
import {
  confirmCashPayment,
  validateConfirmCashPaymentInput,
} from "../src/confirmCashPayment.js";

const CLIENT_A = "11111111-1111-4111-8111-111111111111";
const CLIENT_B = "11111111-1111-4111-8111-222222222222";
const PROVIDER_A = "22222222-2222-4222-8222-222222222222";
const SERVICE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SERVICE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PAYMENT_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

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

function cashPayment(overrides = {}) {
  return {
    id: PAYMENT_A,
    servicio_id: SERVICE_A,
    metodo: "efectivo",
    procesador: "efectivo",
    modelo_pago: "presencial",
    estado: "pendiente",
    ambiente: "real",
    ...overrides,
  };
}

function waitingService(overrides = {}) {
  return {
    id: SERVICE_A,
    cliente_id: CLIENT_A,
    estado: "esperando_aprobacion",
    metadata: { trabajo_aprobado_at: "2026-09-25T05:00:00Z" },
    ambiente: "real",
    ...overrides,
  };
}

function makeFetch({
  authId = CLIENT_A,
  profile = { id: CLIENT_A, tipo: "cliente", activo: true },
  services = [waitingService()],
  payments = [cashPayment()],
  rpcResponse = {
    id: SERVICE_A,
    cliente_id: CLIENT_A,
    estado: "completado",
  },
  rpcStatus = 200,
  rpcMessage = null,
  rpcThrows = false,
  commitOnRpc = true,
}) {
  const calls = [];

  const applyCommit = () => {
    if (!commitOnRpc) return;

    services.splice(0, services.length, {
      ...waitingService(),
      estado: "completado",
      metadata: {
        trabajo_aprobado_at: "2026-09-25T05:00:00Z",
        cliente_pago_efectivo_at: "2026-09-25T05:01:00Z",
      },
    });

    if (payments[0]) {
      payments[0] = { ...payments[0], estado: "liberado" };
    }
  };

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

    if (parsed.pathname === "/rest/v1/pagos") {
      const serviceId = parsed.searchParams
        .get("servicio_id")
        ?.replace(/^eq\./, "");

      return response(
        payments
          .filter((row) => !serviceId || row.servicio_id === serviceId)
          .slice(0, 1)
      );
    }

    if (parsed.pathname === "/rest/v1/rpc/confirmar_pago_efectivo_cliente") {
      applyCommit();

      if (rpcThrows) {
        throw new Error("network lost after commit");
      }

      if (rpcStatus >= 400) {
        return response(
          { message: rpcMessage || "Cierre cash rechazado por backend" },
          rpcStatus
        );
      }

      return response(rpcResponse, rpcStatus);
    }

    return response({}, 404);
  };

  return { fetchImpl, calls, services, payments };
}

function rpcCalls(calls) {
  return calls.filter(({ url }) =>
    url.includes("/rpc/confirmar_pago_efectivo_cliente")
  );
}

test("ugo_confirm_cash_payment: YA PAGUÉ cierra servicio cash y verifica pago liberado", async () => {
  const { fetchImpl, calls } = makeFetch({});

  const result = await confirmCashPayment(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.deepEqual(result, {
    status: "confirmed_cash_payment",
    service_id: SERVICE_A,
    state: "completado",
    payment_state: "liberado",
    idempotent: false,
    reconciled: false,
  });

  assert.equal(rpcCalls(calls).length, 1);
  assert.deepEqual(JSON.parse(String(rpcCalls(calls)[0].options.body)), {
    p_servicio_id: SERVICE_A,
  });
});

test("ugo_confirm_cash_payment: auth.uid distinto no llega al RPC", async () => {
  const { fetchImpl, calls } = makeFetch({ authId: CLIENT_B });

  const result = await confirmCashPayment(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unauthorized");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_confirm_cash_payment: provider role se rechaza antes del backend", () => {
  assert.throws(
    () =>
      validateConfirmCashPaymentInput({
        userId: PROVIDER_A,
        role: "provider",
        serviceId: SERVICE_A,
      }),
    (error) => error?.code === "invalid_input"
  );
});

for (const extra of [
  { amount: 100 },
  { paymentId: PAYMENT_A },
  { externalReference: "fake" },
  { providerId: PROVIDER_A },
  { debt: 0 },
  { rating: 5 },
]) {
  test(`ugo_confirm_cash_payment: rechaza input extra ${Object.keys(extra)[0]}`, () => {
    assert.throws(
      () =>
        validateConfirmCashPaymentInput({
          userId: CLIENT_A,
          role: "client",
          serviceId: SERVICE_A,
          ...extra,
        }),
      (error) => error?.code === "invalid_input"
    );
  });
}

test("ugo_confirm_cash_payment: servicio de otro cliente queda oculto", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [waitingService({ cliente_id: CLIENT_B })],
  });

  const result = await confirmCashPayment(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "not_found_or_unauthorized");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_confirm_cash_payment: exige aprobación previa del trabajo sin mutar", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [waitingService({ metadata: {} })],
  });

  const result = await confirmCashPayment(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "work_not_approved");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_confirm_cash_payment: pago electrónico no puede entrar al RPC cash", async () => {
  const { fetchImpl, calls } = makeFetch({
    payments: [
      cashPayment({
        metodo: "pix",
        procesador: "mercado_pago",
        modelo_pago: "custodia",
        estado: "retenido",
      }),
    ],
  });

  const result = await confirmCashPayment(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "not_cash_payment");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_confirm_cash_payment: estado de pago no confirmable se rechaza sin mutar", async () => {
  const { fetchImpl, calls } = makeFetch({
    payments: [cashPayment({ estado: "reembolsado" })],
  });

  const result = await confirmCashPayment(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "invalid_payment_state");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_confirm_cash_payment: cash ya cerrado es idempotente sin repetir RPC", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [waitingService({ estado: "completado" })],
    payments: [cashPayment({ estado: "liberado" })],
  });

  const result = await confirmCashPayment(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "confirmed_cash_payment");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, false);
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_confirm_cash_payment: completado electrónico no se confunde con cierre cash", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [waitingService({ estado: "completado" })],
    payments: [
      cashPayment({
        metodo: "pix",
        procesador: "mercado_pago",
        modelo_pago: "custodia",
        estado: "liberado",
      }),
    ],
  });

  const result = await confirmCashPayment(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "invalid_state");
  assert.equal(rpcCalls(calls).length, 0);
});

test("ugo_confirm_cash_payment: falta de pago conserva rechazo exacto del backend", async () => {
  const message = "Este servicio no está configurado para pago en efectivo";
  const { fetchImpl } = makeFetch({
    payments: [],
    rpcStatus: 400,
    rpcMessage: message,
    commitOnRpc: false,
  });

  await assert.rejects(
    () =>
      confirmCashPayment(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) =>
      error?.code === "backend_rejected" &&
      error?.status === 400 &&
      error?.message === message
  );
});

test("ugo_confirm_cash_payment: fallo de red después del commit se reconcilia por servicio+pago", async () => {
  const { fetchImpl } = makeFetch({
    rpcThrows: true,
    commitOnRpc: true,
  });

  const result = await confirmCashPayment(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "confirmed_cash_payment");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, true);
});

test("ugo_confirm_cash_payment: respuesta backend para otro serviceId se rechaza", async () => {
  const { fetchImpl } = makeFetch({
    rpcResponse: {
      id: SERVICE_B,
      cliente_id: CLIENT_A,
      estado: "completado",
    },
  });

  await assert.rejects(
    () =>
      confirmCashPayment(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) => error?.code === "scope_mismatch"
  );
});

test("ugo_confirm_cash_payment: respuesta backend para otro cliente se rechaza", async () => {
  const { fetchImpl } = makeFetch({
    rpcResponse: {
      id: SERVICE_A,
      cliente_id: CLIENT_B,
      estado: "completado",
    },
  });

  await assert.rejects(
    () =>
      confirmCashPayment(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) => error?.code === "scope_mismatch"
  );
});

test("ugo_confirm_cash_payment: respuesta exitosa sin persistencia de pago liberado se rechaza", async () => {
  const { fetchImpl } = makeFetch({
    commitOnRpc: false,
  });

  await assert.rejects(
    () =>
      confirmCashPayment(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl }
      ),
    (error) => error?.code === "backend_invalid_response"
  );
});

test("ugo_confirm_cash_payment: payment row cross-service se rechaza scope_mismatch", async () => {
  const { fetchImpl } = makeFetch({
    payments: [cashPayment({ servicio_id: SERVICE_B })],
  });

  const original = fetchImpl;
  const forgedFetch = async (url, options = {}) => {
    const parsed = new URL(String(url));
    if (parsed.pathname === "/rest/v1/pagos") {
      return response([cashPayment({ servicio_id: SERVICE_B })]);
    }
    return original(url, options);
  };

  await assert.rejects(
    () =>
      confirmCashPayment(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: testEnv, fetchImpl: forgedFetch }
      ),
    (error) => error?.code === "scope_mismatch"
  );
});

test("ugo_confirm_cash_payment: PROD queda bloqueado antes de mutar", async () => {
  const { fetchImpl, calls } = makeFetch({});

  await assert.rejects(
    () =>
      confirmCashPayment(
        { userId: CLIENT_A, role: "client", serviceId: SERVICE_A },
        { env: prodEnv, fetchImpl }
      ),
    (error) =>
      error?.code === "backend_contract_not_ready" &&
      error?.status === 409
  );

  assert.equal(rpcCalls(calls).length, 0);
});
