import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptJob,
  validateAcceptJobInput,
} from "../src/acceptJob.js";

const PROVIDER_A = "22222222-2222-4222-8222-222222222222";
const PROVIDER_B = "22222222-2222-4222-8222-333333333333";
const CLIENT_A = "11111111-1111-4111-8111-111111111111";
const SERVICE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SERVICE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OFFER_A = "33333333-3333-4333-8333-333333333333";
const OFFER_B = "44444444-4444-4444-8444-444444444444";

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
  offers = [
    {
      id: OFFER_A,
      servicio_id: SERVICE_A,
      proveedor_id: PROVIDER_A,
      estado: "pendiente",
      expira_at: "2026-09-26T00:00:00Z",
      respondida_at: null,
    },
  ],
  services = [],
  rpcResponse = {
    id: SERVICE_A,
    proveedor_id: PROVIDER_A,
    estado: "asignado",
  },
  rpcStatus = 200,
  rpcThrows = false,
  commitBeforeFailure = false,
}) {
  const calls = [];

  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const parsed = new URL(String(url));

    if (parsed.pathname === "/auth/v1/user") return response({ id: authId });
    if (parsed.pathname === "/rest/v1/usuarios") {
      return response(profile ? [profile] : []);
    }

    if (parsed.pathname === "/rest/v1/ofertas_servicio") {
      const id = parsed.searchParams.get("id")?.replace(/^eq\./, "");
      const provider = parsed.searchParams
        .get("proveedor_id")
        ?.replace(/^eq\./, "");
      return response(
        offers
          .filter((row) => (!id || row.id === id) && (!provider || row.proveedor_id === provider))
          .slice(0, 1)
      );
    }

    if (parsed.pathname === "/rest/v1/servicios") {
      const id = parsed.searchParams.get("id")?.replace(/^eq\./, "");
      const provider = parsed.searchParams
        .get("proveedor_id")
        ?.replace(/^eq\./, "");
      return response(
        services
          .filter((row) => (!id || row.id === id) && (!provider || row.proveedor_id === provider))
          .slice(0, 1)
      );
    }

    if (parsed.pathname === "/rest/v1/rpc/aceptar_oferta") {
      if (commitBeforeFailure) {
        const offer = offers.find((row) => row.id === OFFER_A);
        if (offer) offer.estado = "aceptada";
        services.splice(0, services.length, {
          id: SERVICE_A,
          proveedor_id: PROVIDER_A,
          estado: "asignado",
        });
      }
      if (rpcThrows) throw new Error("network lost after commit");
      return response(rpcResponse, rpcStatus);
    }

    return response({}, 404);
  };

  return { fetchImpl, calls, offers, services };
}

test("ugo_accept_job: provider acepta su oferta exacta usando el RPC canónico", async () => {
  const { fetchImpl, calls } = makeFetch({});
  const result = await acceptJob(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "accepted");
  assert.equal(result.service_id, SERVICE_A);
  assert.equal(result.offer_id, OFFER_A);
  assert.equal(result.state, "asignado");
  assert.equal(result.idempotent, false);
  const rpc = calls.find(({ url }) => url.includes("/rpc/aceptar_oferta"));
  assert.ok(rpc);
  assert.deepEqual(JSON.parse(String(rpc.options.body)), { p_oferta_id: OFFER_A });
});

test("ugo_accept_job: rechaza client role e IDs ausentes antes de mutar", () => {
  assert.throws(
    () => validateAcceptJobInput({ userId: CLIENT_A, role: "client", serviceId: SERVICE_A, offerId: OFFER_A }),
    (error) => error?.code === "invalid_input"
  );
  assert.throws(
    () => validateAcceptJobInput({ userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A }),
    (error) => error?.code === "invalid_input"
  );
});

test("ugo_accept_job: auth.uid distinto de userId no llega al RPC", async () => {
  const { fetchImpl, calls } = makeFetch({ authId: PROVIDER_B });
  const result = await acceptJob(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unauthorized");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/aceptar_oferta")), false);
});

test("ugo_accept_job: no permite aceptar oferta de otro proveedor", async () => {
  const { fetchImpl, calls } = makeFetch({
    offers: [{ id: OFFER_A, servicio_id: SERVICE_A, proveedor_id: PROVIDER_B, estado: "pendiente" }],
  });
  const result = await acceptJob(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unauthorized");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/aceptar_oferta")), false);
});

test("ugo_accept_job: oferta cross-service se rechaza antes del RPC", async () => {
  const { fetchImpl, calls } = makeFetch({
    offers: [{ id: OFFER_A, servicio_id: SERVICE_B, proveedor_id: PROVIDER_A, estado: "pendiente" }],
  });
  await assert.rejects(
    () => acceptJob(
      { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
      { env: testEnv, fetchImpl }
    ),
    (error) => error?.code === "offer_scope_mismatch"
  );
  assert.equal(calls.some(({ url }) => url.includes("/rpc/aceptar_oferta")), false);
});

test("ugo_accept_job: oferta expirada no se muta", async () => {
  const { fetchImpl, calls } = makeFetch({
    offers: [{ id: OFFER_A, servicio_id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "expirada" }],
  });
  const result = await acceptJob(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "offer_expired");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/aceptar_oferta")), false);
});

test("ugo_accept_job: servicio ya tomado deja la oportunidad unavailable", async () => {
  const { fetchImpl } = makeFetch({
    offers: [{ id: OFFER_A, servicio_id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "rechazada" }],
  });
  const result = await acceptJob(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "offer_unavailable");
});

test("ugo_accept_job: llamada repetida es idempotente sin repetir el RPC", async () => {
  const { fetchImpl, calls } = makeFetch({
    offers: [{ id: OFFER_A, servicio_id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "aceptada" }],
    services: [{ id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "asignado" }],
  });
  const result = await acceptJob(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "accepted");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, true);
  assert.equal(calls.some(({ url }) => url.includes("/rpc/aceptar_oferta")), false);
});

test("ugo_accept_job: respuesta backend para otro serviceId se rechaza", async () => {
  const { fetchImpl } = makeFetch({
    rpcResponse: { id: SERVICE_B, proveedor_id: PROVIDER_A, estado: "asignado" },
  });
  await assert.rejects(
    () => acceptJob(
      { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
      { env: testEnv, fetchImpl }
    ),
    (error) => error?.code === "accept_scope_mismatch"
  );
});

test("ugo_accept_job: fallo de red después de commit se reconcilia por estado persistido", async () => {
  const { fetchImpl } = makeFetch({ commitBeforeFailure: true, rpcThrows: true });
  const result = await acceptJob(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "accepted");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, true);
});

for (const label of ["deuda de 3 servicios", "trabajo inmediato incompatible con agenda activa"]) {
  test(`ugo_accept_job: conserva rechazo backend por ${label}`, async () => {
    const { fetchImpl } = makeFetch({ rpcResponse: { message: "backend rejected" }, rpcStatus: 400 });
    await assert.rejects(
      () => acceptJob(
        { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
        { env: testEnv, fetchImpl }
      ),
      (error) => error?.code === "backend_error" && error?.status === 400
    );
  });
}

test("ugo_accept_job: un trabajo futuro válido acepta si el backend lo autoriza", async () => {
  const { fetchImpl } = makeFetch({
    rpcResponse: { id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "asignado", programado_para: "2026-09-26T18:00:00Z" },
  });
  const result = await acceptJob(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "accepted");
  assert.equal(result.state, "asignado");
});

test("ugo_accept_job: PROD queda bloqueado hasta promover deuda/agenda", async () => {
  const { fetchImpl, calls } = makeFetch({});
  await assert.rejects(
    () => acceptJob(
      { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
      { env: prodEnv, fetchImpl }
    ),
    (error) => error?.code === "backend_contract_not_ready" && error?.status === 409
  );
  assert.equal(calls.some(({ url }) => url.includes("/rpc/aceptar_oferta")), false);
});

test("ugo_accept_job: offerId B nunca sustituye silenciosamente a offerId A", async () => {
  const { fetchImpl, calls } = makeFetch({
    offers: [{ id: OFFER_B, servicio_id: SERVICE_A, proveedor_id: PROVIDER_A, estado: "pendiente" }],
  });
  const result = await acceptJob(
    { userId: PROVIDER_A, role: "provider", serviceId: SERVICE_A, offerId: OFFER_A },
    { env: testEnv, fetchImpl }
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unauthorized");
  assert.equal(calls.some(({ url }) => url.includes("/rpc/aceptar_oferta")), false);
});
