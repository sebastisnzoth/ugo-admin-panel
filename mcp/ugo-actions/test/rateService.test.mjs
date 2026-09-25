import test from "node:test";
import assert from "node:assert/strict";
import {
  rateService,
  validateRateServiceInput,
} from "../src/rateService.js";

const CLIENT_A = "11111111-1111-4111-8111-111111111111";
const CLIENT_B = "11111111-1111-4111-8111-222222222222";
const PROVIDER_A = "22222222-2222-4222-8222-222222222222";
const PROVIDER_B = "22222222-2222-4222-8222-333333333333";
const SERVICE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SERVICE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RATING_A = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

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

function completedService(overrides = {}) {
  return {
    id: SERVICE_A,
    cliente_id: CLIENT_A,
    proveedor_id: PROVIDER_A,
    estado: "completado",
    ...overrides,
  };
}

function ratingRow({
  role = "client",
  score = 5,
  comment = "Excelente",
  overrides = {},
} = {}) {
  return {
    id: RATING_A,
    servicio_id: SERVICE_A,
    cliente_id: CLIENT_A,
    proveedor_id: PROVIDER_A,
    autor_tipo: role === "client" ? "cliente" : "proveedor",
    puntuacion: score,
    comentario: comment,
    created_at: "2026-09-25T06:00:00Z",
    ...overrides,
  };
}

function makeFetch({
  authId = CLIENT_A,
  profile = { id: CLIENT_A, tipo: "cliente", activo: true },
  services = [completedService()],
  ratings = [],
  insertStatus = 201,
  insertMessage = null,
  insertThrows = false,
  commitOnInsert = true,
  responseOverride = null,
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
      const client = parsed.searchParams.get("cliente_id")?.replace(/^eq\./, "");
      const provider = parsed.searchParams.get("proveedor_id")?.replace(/^eq\./, "");
      return response(
        services.filter(row =>
          (!id || row.id === id) &&
          (!client || row.cliente_id === client) &&
          (!provider || row.proveedor_id === provider)
        ).slice(0, 1)
      );
    }

    if (parsed.pathname === "/rest/v1/resenas" && (options.method || "GET") === "GET") {
      const serviceId = parsed.searchParams.get("servicio_id")?.replace(/^eq\./, "");
      const author = parsed.searchParams.get("autor_tipo")?.replace(/^eq\./, "");
      const client = parsed.searchParams.get("cliente_id")?.replace(/^eq\./, "");
      const provider = parsed.searchParams.get("proveedor_id")?.replace(/^eq\./, "");
      return response(
        ratings.filter(row =>
          (!serviceId || row.servicio_id === serviceId) &&
          (!author || row.autor_tipo === author) &&
          (!client || row.cliente_id === client) &&
          (!provider || row.proveedor_id === provider)
        ).slice(0, 1)
      );
    }

    if (parsed.pathname === "/rest/v1/resenas" && options.method === "POST") {
      const payload = JSON.parse(String(options.body));
      const inserted = {
        id: RATING_A,
        created_at: "2026-09-25T06:00:00Z",
        ...payload,
      };

      if (commitOnInsert) {
        ratings.splice(0, ratings.length, inserted);
      }

      if (insertThrows) {
        throw new Error("network lost after commit");
      }

      if (insertStatus >= 400) {
        return response(
          { message: insertMessage || "Insert rechazado" },
          insertStatus
        );
      }

      return response(
        responseOverride === null ? [inserted] : responseOverride,
        insertStatus
      );
    }

    return response({}, 404);
  };

  return { fetchImpl, calls };
}

function postCalls(calls) {
  return calls.filter(({ url, options }) =>
    url.includes("/rest/v1/resenas") && options.method === "POST"
  );
}

test("ugo_rate_service: cliente califica proveedor con IDs derivados del servicio", async () => {
  const { fetchImpl, calls } = makeFetch({});

  const result = await rateService(
    {
      userId: CLIENT_A,
      role: "client",
      serviceId: SERVICE_A,
      score: 5,
      comment: "  Excelente  ",
    },
    { env: testEnv, fetchImpl }
  );

  assert.deepEqual(result, {
    status: "rated_service",
    service_id: SERVICE_A,
    state: "completado",
    author_role: "client",
    score: 5,
    comment_saved: true,
    idempotent: false,
    reconciled: false,
  });

  assert.equal(postCalls(calls).length, 1);
  assert.deepEqual(JSON.parse(String(postCalls(calls)[0].options.body)), {
    servicio_id: SERVICE_A,
    cliente_id: CLIENT_A,
    proveedor_id: PROVIDER_A,
    autor_tipo: "cliente",
    puntuacion: 5,
    comentario: "Excelente",
  });
});

test("ugo_rate_service: proveedor califica cliente con autor derivado", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: PROVIDER_A,
    profile: { id: PROVIDER_A, tipo: "proveedor", activo: true },
  });

  const result = await rateService(
    {
      userId: PROVIDER_A,
      role: "provider",
      serviceId: SERVICE_A,
      score: 4,
    },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rated_service");
  assert.equal(result.author_role, "provider");
  assert.equal(result.comment_saved, false);
  assert.deepEqual(JSON.parse(String(postCalls(calls)[0].options.body)), {
    servicio_id: SERVICE_A,
    cliente_id: CLIENT_A,
    proveedor_id: PROVIDER_A,
    autor_tipo: "proveedor",
    puntuacion: 4,
    comentario: null,
  });
});

test("ugo_rate_service: auth.uid distinto no inserta", async () => {
  const { fetchImpl, calls } = makeFetch({ authId: CLIENT_B });

  const result = await rateService(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A, score: 5 },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unauthorized");
  assert.equal(postCalls(calls).length, 0);
});

test("ugo_rate_service: ownership del rol oculta servicios ajenos", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [completedService({ cliente_id: CLIENT_B })],
  });

  const result = await rateService(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A, score: 5 },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "not_found_or_unauthorized");
  assert.equal(postCalls(calls).length, 0);
});

test("ugo_rate_service: sólo admite servicios completados", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [completedService({ estado: "esperando_aprobacion" })],
  });

  const result = await rateService(
    { userId: CLIENT_A, role: "client", serviceId: SERVICE_A, score: 5 },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "invalid_state");
  assert.equal(postCalls(calls).length, 0);
});

test("ugo_rate_service: servicio sin contraparte se rechaza", async () => {
  const { fetchImpl, calls } = makeFetch({
    services: [completedService({ proveedor_id: null })],
  });

  await assert.rejects(
    () => rateService(
      { userId: CLIENT_A, role: "client", serviceId: SERVICE_A, score: 5 },
      { env: testEnv, fetchImpl }
    ),
    error => error?.code === "backend_invalid_response"
  );

  assert.equal(postCalls(calls).length, 0);
});

for (const score of [0, 6, 2.5, "5", null]) {
  test(`ugo_rate_service: score inválido ${String(score)} se rechaza`, () => {
    assert.throws(
      () => validateRateServiceInput({
        userId: CLIENT_A,
        role: "client",
        serviceId: SERVICE_A,
        score,
      }),
      error => error?.code === "invalid_input"
    );
  });
}

test("ugo_rate_service: comentario se limita a 500 caracteres", () => {
  assert.throws(
    () => validateRateServiceInput({
      userId: CLIENT_A,
      role: "client",
      serviceId: SERVICE_A,
      score: 5,
      comment: "x".repeat(501),
    }),
    error => error?.code === "invalid_input"
  );
});

for (const extra of [
  { clienteId: CLIENT_B },
  { proveedorId: PROVIDER_B },
  { autor_tipo: "proveedor" },
  { targetUserId: PROVIDER_B },
  { karma: 5 },
]) {
  test(`ugo_rate_service: rechaza target extra ${Object.keys(extra)[0]}`, () => {
    assert.throws(
      () => validateRateServiceInput({
        userId: CLIENT_A,
        role: "client",
        serviceId: SERVICE_A,
        score: 5,
        ...extra,
      }),
      error => error?.code === "invalid_input"
    );
  });
}

test("ugo_rate_service: rating idéntico existente es idempotente", async () => {
  const { fetchImpl, calls } = makeFetch({
    ratings: [ratingRow({ score: 5, comment: "Excelente" })],
  });

  const result = await rateService(
    {
      userId: CLIENT_A,
      role: "client",
      serviceId: SERVICE_A,
      score: 5,
      comment: "Excelente",
    },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rated_service");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, false);
  assert.equal(postCalls(calls).length, 0);
});

test("ugo_rate_service: rating existente diferente nunca se sobreescribe", async () => {
  const { fetchImpl, calls } = makeFetch({
    ratings: [ratingRow({ score: 3, comment: "Regular" })],
  });

  const result = await rateService(
    {
      userId: CLIENT_A,
      role: "client",
      serviceId: SERVICE_A,
      score: 5,
      comment: "Excelente",
    },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "already_rated");
  assert.equal(postCalls(calls).length, 0);
});

test("ugo_rate_service: fallo de red después del insert se reconcilia", async () => {
  const { fetchImpl } = makeFetch({
    insertThrows: true,
    commitOnInsert: true,
  });

  const result = await rateService(
    {
      userId: CLIENT_A,
      role: "client",
      serviceId: SERVICE_A,
      score: 5,
      comment: "Excelente",
    },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rated_service");
  assert.equal(result.idempotent, true);
  assert.equal(result.reconciled, true);
});

test("ugo_rate_service: duplicate backend con rating persistido idéntico se reconcilia", async () => {
  const { fetchImpl } = makeFetch({
    insertStatus: 409,
    insertMessage: "duplicate key",
    commitOnInsert: true,
  });

  const result = await rateService(
    {
      userId: CLIENT_A,
      role: "client",
      serviceId: SERVICE_A,
      score: 5,
      comment: "Excelente",
    },
    { env: testEnv, fetchImpl }
  );

  assert.equal(result.status, "rated_service");
  assert.equal(result.reconciled, true);
});

test("ugo_rate_service: respuesta insert cross-service se rechaza", async () => {
  const { fetchImpl } = makeFetch({
    commitOnInsert: false,
    responseOverride: [ratingRow({ overrides: { servicio_id: SERVICE_B } })],
  });

  await assert.rejects(
    () => rateService(
      {
        userId: CLIENT_A,
        role: "client",
        serviceId: SERVICE_A,
        score: 5,
        comment: "Excelente",
      },
      { env: testEnv, fetchImpl }
    ),
    error => error?.code === "scope_mismatch"
  );
});

test("ugo_rate_service: respuesta insert con autor equivocado se rechaza", async () => {
  const { fetchImpl } = makeFetch({
    commitOnInsert: false,
    responseOverride: [ratingRow({ role: "provider" })],
  });

  await assert.rejects(
    () => rateService(
      {
        userId: CLIENT_A,
        role: "client",
        serviceId: SERVICE_A,
        score: 5,
        comment: "Excelente",
      },
      { env: testEnv, fetchImpl }
    ),
    error => error?.code === "scope_mismatch"
  );
});

test("ugo_rate_service: éxito sin prueba persistida se rechaza", async () => {
  const { fetchImpl } = makeFetch({ commitOnInsert: false });

  await assert.rejects(
    () => rateService(
      {
        userId: CLIENT_A,
        role: "client",
        serviceId: SERVICE_A,
        score: 5,
        comment: "Excelente",
      },
      { env: testEnv, fetchImpl }
    ),
    error => error?.code === "backend_invalid_response"
  );
});

test("ugo_rate_service: PROD queda bloqueado antes de insertar", async () => {
  const { fetchImpl, calls } = makeFetch({});

  await assert.rejects(
    () => rateService(
      {
        userId: CLIENT_A,
        role: "client",
        serviceId: SERVICE_A,
        score: 5,
      },
      { env: prodEnv, fetchImpl }
    ),
    error =>
      error?.code === "backend_contract_not_ready" &&
      error?.status === 409
  );

  assert.equal(postCalls(calls).length, 0);
});
