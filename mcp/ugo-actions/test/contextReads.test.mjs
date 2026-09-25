import test from "node:test";
import assert from "node:assert/strict";
import {
  getCurrentUser,
  getJobHistory,
  getProviderOffers,
  getSavedPlaces,
  validateContextInput,
} from "../src/contextReads.js";

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";
const PROVIDER_ID = "22222222-2222-4222-8222-222222222222";
const SERVICE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

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

function makeFetch({
  authId,
  userRow,
  clientProfile = null,
  providerProfile = null,
  offers = [],
  places = [],
  services = [],
}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const parsed = new URL(String(url));

    if (parsed.pathname === "/auth/v1/user") {
      return response({ id: authId });
    }
    if (parsed.pathname === "/rest/v1/usuarios") {
      return response(userRow ? [userRow] : []);
    }
    if (parsed.pathname === "/rest/v1/perfiles_cliente") {
      return response(clientProfile ? [clientProfile] : []);
    }
    if (parsed.pathname === "/rest/v1/perfiles_proveedor") {
      return response(providerProfile ? [providerProfile] : []);
    }
    if (parsed.pathname === "/rest/v1/rpc/obtener_ofertas_proveedor") {
      return response(offers);
    }
    if (parsed.pathname === "/rest/v1/direcciones_cliente") {
      const owner = parsed.searchParams.get("usuario_id")?.replace(/^eq\./, "");
      return response(places.filter((row) => !owner || row.usuario_id === owner));
    }
    if (parsed.pathname === "/rest/v1/servicios") {
      const client = parsed.searchParams.get("cliente_id")?.replace(/^eq\./, "");
      const provider = parsed.searchParams.get("proveedor_id")?.replace(/^eq\./, "");
      return response(
        services
          .filter((row) => (!client || row.cliente_id === client) && (!provider || row.proveedor_id === provider))
          .slice(0, Number(parsed.searchParams.get("limit") || 20))
      );
    }
    return response({}, 404);
  };
  return { fetchImpl, calls };
}

test("context input exige rol válido y limita listados", () => {
  assert.deepEqual(
    validateContextInput({ userId: CLIENT_ID, role: "client", limit: 10 }, { withLimit: true }),
    { userId: CLIENT_ID, role: "client", limit: 10 }
  );
  assert.throws(
    () => validateContextInput({ userId: CLIENT_ID, role: "admin" }),
    /role debe ser client o provider/
  );
  assert.throws(
    () => validateContextInput({ userId: CLIENT_ID, role: "client", limit: 51 }, { withLimit: true }),
    /entero entre 1 y 50/
  );
});

test("current user devuelve sólo perfil seguro y no filtra secretos del proveedor", async () => {
  const { fetchImpl } = makeFetch({
    authId: PROVIDER_ID,
    userRow: {
      id: PROVIDER_ID,
      nombre: "Proveedor",
      apellido: "Seguro",
      tipo: "proveedor",
      activo: true,
      foto_url: null,
      pais: "BR",
      zona: "Florianópolis",
      karma: 4.9,
      servicios_completados: 20,
      email: "secret@example.com",
      telefono: "secret",
    },
    providerProfile: {
      usuario_id: PROVIDER_ID,
      bio: "Profesional",
      tarifa_base: 100,
      online: true,
      disponible: true,
      zona_radio_km: 12,
      estado_verificacion: "aprobado",
      categoria_principal_id: null,
      experiencia_anos: 8,
      especialidades: "plomería",
      idiomas: "pt,es",
      disponibilidad_horaria: "08-18",
      ciudad_base: "Florianópolis",
      onboarding_completo_at: "2026-09-01T00:00:00Z",
      cpf: "NO-DEBE-SALIR",
      pix_chave: "NO-DEBE-SALIR",
    },
  });

  const result = await getCurrentUser(
    { userId: PROVIDER_ID, role: "provider" },
    { env: baseEnv, fetchImpl }
  );

  assert.equal(result.status, "ok");
  assert.equal(result.user.id, PROVIDER_ID);
  assert.equal(result.profile.ciudad_base, "Florianópolis");
  assert.equal("email" in result.user, false);
  assert.equal("telefono" in result.user, false);
  assert.equal("cpf" in result.profile, false);
  assert.equal("pix_chave" in result.profile, false);
});

test("provider offers usa el RPC autorizado y no expone dirección exacta", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: PROVIDER_ID,
    userRow: { id: PROVIDER_ID, tipo: "proveedor", activo: true },
    offers: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        servicio_id: SERVICE_ID,
        proveedor_id: PROVIDER_ID,
        estado: "pendiente",
        ranking: 1,
        distancia_km: 2.4,
        tarifa_ofrecida: 120,
        servicio: {
          id: SERVICE_ID,
          numero: 50,
          estado: "ofrecido",
          descripcion: "Reparación",
          direccion_cliente: "NO-DEBE-SALIR",
          zona_cliente: "Centro, Florianópolis",
          metadata: { requested_when: "ahora", should_not_leak: true },
          cliente: { nombre: "Cliente UGO" },
          categoria: { nombre: "Plomería", emoji: "🔧" },
        },
      },
    ],
  });

  const result = await getProviderOffers(
    { userId: PROVIDER_ID, role: "provider", limit: 10 },
    { env: baseEnv, fetchImpl }
  );

  assert.equal(result.status, "ok");
  assert.equal(result.count, 1);
  assert.equal(result.offers[0].servicio.zona_cliente, "Centro, Florianópolis");
  assert.equal("direccion_cliente" in result.offers[0].servicio, false);
  assert.equal("should_not_leak" in result.offers[0].servicio.metadata, false);
  const rpcCall = calls.find((call) => call.url.includes("/rpc/obtener_ofertas_proveedor"));
  assert.equal(rpcCall.options.method, "POST");
});

test("provider offers rechaza una respuesta cruzada de otro proveedor", async () => {
  const { fetchImpl } = makeFetch({
    authId: PROVIDER_ID,
    userRow: { id: PROVIDER_ID, tipo: "proveedor", activo: true },
    offers: [{ id: "33333333-3333-4333-8333-333333333333", proveedor_id: CLIENT_ID }],
  });

  await assert.rejects(
    () =>
      getProviderOffers(
        { userId: PROVIDER_ID, role: "provider" },
        { env: baseEnv, fetchImpl }
      ),
    (error) => error?.code === "offer_scope_mismatch"
  );
});

test("saved places aplica ownership explícito del cliente y conserva sus coordenadas", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: CLIENT_ID,
    userRow: { id: CLIENT_ID, tipo: "cliente", activo: true },
    places: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        usuario_id: CLIENT_ID,
        etiqueta: "Casa",
        direccion: "Rua autorizada 123",
        complemento: null,
        barrio: "Centro",
        ciudad: "Florianópolis",
        latitud: -27.59,
        longitud: -48.55,
        es_predeterminada: true,
      },
    ],
  });

  const result = await getSavedPlaces(
    { userId: CLIENT_ID, role: "client", limit: 5 },
    { env: baseEnv, fetchImpl }
  );

  assert.equal(result.status, "ok");
  assert.equal(result.places[0].etiqueta, "Casa");
  assert.equal(result.places[0].latitud, -27.59);
  const url = new URL(calls.find((call) => call.url.includes("/direcciones_cliente")).url);
  assert.equal(url.searchParams.get("usuario_id"), `eq.${CLIENT_ID}`);
  assert.equal(url.searchParams.get("limit"), "5");
});

test("job history usa ownership distinto para cliente y proveedor", async () => {
  const rows = [
    {
      id: SERVICE_ID,
      numero: 50,
      cliente_id: CLIENT_ID,
      proveedor_id: PROVIDER_ID,
      categoria_id: "55555555-5555-4555-8555-555555555555",
      estado: "completado",
      descripcion: "Trabajo terminado",
      tarifa: 120,
      moneda: "BRL",
      updated_at: "2026-09-24T12:00:00Z",
    },
  ];
  const client = makeFetch({
    authId: CLIENT_ID,
    userRow: { id: CLIENT_ID, tipo: "cliente", activo: true },
    services: rows,
  });
  const provider = makeFetch({
    authId: PROVIDER_ID,
    userRow: { id: PROVIDER_ID, tipo: "proveedor", activo: true },
    services: rows,
  });

  const clientResult = await getJobHistory(
    { userId: CLIENT_ID, role: "client" },
    { env: baseEnv, fetchImpl: client.fetchImpl }
  );
  const providerResult = await getJobHistory(
    { userId: PROVIDER_ID, role: "provider" },
    { env: baseEnv, fetchImpl: provider.fetchImpl }
  );

  assert.equal(clientResult.services[0].id, SERVICE_ID);
  assert.equal(providerResult.services[0].id, SERVICE_ID);
  const clientUrl = new URL(client.calls.find((call) => call.url.includes("/servicios")).url);
  const providerUrl = new URL(provider.calls.find((call) => call.url.includes("/servicios")).url);
  assert.equal(clientUrl.searchParams.get("cliente_id"), `eq.${CLIENT_ID}`);
  assert.equal(providerUrl.searchParams.get("proveedor_id"), `eq.${PROVIDER_ID}`);
  assert.equal("cliente_id" in clientResult.services[0], false);
  assert.equal("proveedor_id" in providerResult.services[0], false);
});

test("identidad autenticada distinta corta antes de leer recursos", async () => {
  const { fetchImpl, calls } = makeFetch({
    authId: PROVIDER_ID,
    userRow: { id: PROVIDER_ID, tipo: "proveedor", activo: true },
    places: [],
  });

  const result = await getSavedPlaces(
    { userId: CLIENT_ID, role: "client" },
    { env: baseEnv, fetchImpl }
  );

  assert.equal(result.status, "unauthorized");
  assert.equal(result.reason, "authenticated_user_mismatch");
  assert.equal(calls.some((call) => call.url.includes("/direcciones_cliente")), false);
});
