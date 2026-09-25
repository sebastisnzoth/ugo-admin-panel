import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { getCurrentJob, UgoMcpError } from "./currentJob.js";
import { getProviderLocation, getService } from "./serviceReads.js";
import { getCurrentUser, getJobHistory, getProviderOffers, getSavedPlaces } from "./contextReads.js";
import { markArrived } from "./arrival.js";
import { acceptJob } from "./acceptJob.js";

function jsonToolResult(payload, isError = false) {
  return {
    ...(isError ? { isError: true } : {}),
    content: [{ type: "text", text: JSON.stringify(payload) }],
  };
}

serveStdio(() => {
  const server = new McpServer({
    name: "ugo-actions",
    version: "0.6.0",
  });

  server.registerTool(
    "ugo_ping",
    {
      description: "Verifica que UGO Actions MCP esté funcionando",
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        {
          type: "text",
          text: "UGO Actions MCP OK",
        },
      ],
    })
  );

  server.registerTool(
    "ugo_get_current_job",
    {
      description:
        "Lee un servicio real autorizado del usuario usando su sesión Supabase. Si hay más de un servicio activo, exige serviceId explícito.",
      inputSchema: z.object({
        userId: z.string().uuid(),
        role: z.enum(["client", "provider"]),
        serviceId: z.string().uuid().optional(),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(await getCurrentJob(input));
      } catch (error) {
        const known = error instanceof UgoMcpError;
        return jsonToolResult(
          {
            status: "error",
            code: known ? error.code : "internal_error",
            message: known ? error.message : "UGO Actions MCP no pudo completar la lectura",
          },
          true
        );
      }
    }
  );


  server.registerTool(
    "ugo_get_service",
    {
      description:
        "Lee un serviceId exacto autorizado. Requiere identidad y rol explícitos; no resuelve pedidos por número ni por último servicio.",
      inputSchema: z.object({
        userId: z.string().uuid(),
        role: z.enum(["client", "provider"]),
        serviceId: z.string().uuid(),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(await getService(input));
      } catch (error) {
        const known = error instanceof UgoMcpError;
        return jsonToolResult(
          {
            status: "error",
            code: known ? error.code : "internal_error",
            message: known ? error.message : "UGO Actions MCP no pudo leer el servicio",
          },
          true
        );
      }
    }
  );

  server.registerTool(
    "ugo_get_provider_location",
    {
      description:
        "Lee tracking autorizado del proveedor para un serviceId exacto. No escribe GPS y no inventa ubicación.",
      inputSchema: z.object({
        userId: z.string().uuid(),
        role: z.enum(["client", "provider"]),
        serviceId: z.string().uuid(),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(await getProviderLocation(input));
      } catch (error) {
        const known = error instanceof UgoMcpError;
        return jsonToolResult(
          {
            status: "error",
            code: known ? error.code : "internal_error",
            message: known ? error.message : "UGO Actions MCP no pudo leer el tracking",
          },
          true
        );
      }
    }
  );


  server.registerTool(
    "ugo_get_current_user",
    {
      description:
        "Lee identidad y perfil operativo seguro del usuario autenticado. No expone email, teléfono, CPF, PIX ni credenciales.",
      inputSchema: z.object({
        userId: z.string().uuid(),
        role: z.enum(["client", "provider"]),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(await getCurrentUser(input));
      } catch (error) {
        const known = error instanceof UgoMcpError;
        return jsonToolResult(
          {
            status: "error",
            code: known ? error.code : "internal_error",
            message: known ? error.message : "UGO Actions MCP no pudo leer el usuario",
          },
          true
        );
      }
    }
  );

  server.registerTool(
    "ugo_get_provider_offers",
    {
      description:
        "Lee ofertas vigentes del proveedor autenticado usando el RPC seguro de UGO. No expone la dirección exacta del cliente.",
      inputSchema: z.object({
        userId: z.string().uuid(),
        role: z.literal("provider"),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(await getProviderOffers(input));
      } catch (error) {
        const known = error instanceof UgoMcpError;
        return jsonToolResult(
          {
            status: "error",
            code: known ? error.code : "internal_error",
            message: known ? error.message : "UGO Actions MCP no pudo leer las ofertas",
          },
          true
        );
      }
    }
  );

  server.registerTool(
    "ugo_get_saved_places",
    {
      description:
        "Lee los lugares guardados del cliente autenticado con ownership explícito y RLS. No escribe ni cambia el lugar principal.",
      inputSchema: z.object({
        userId: z.string().uuid(),
        role: z.literal("client"),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(await getSavedPlaces(input));
      } catch (error) {
        const known = error instanceof UgoMcpError;
        return jsonToolResult(
          {
            status: "error",
            code: known ? error.code : "internal_error",
            message: known ? error.message : "UGO Actions MCP no pudo leer los lugares guardados",
          },
          true
        );
      }
    }
  );

  server.registerTool(
    "ugo_get_job_history",
    {
      description:
        "Lee el historial reciente del cliente o proveedor autenticado con filtro de ownership y RLS. Devuelve un resumen sin direcciones ni metadata arbitraria.",
      inputSchema: z.object({
        userId: z.string().uuid(),
        role: z.enum(["client", "provider"]),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(await getJobHistory(input));
      } catch (error) {
        const known = error instanceof UgoMcpError;
        return jsonToolResult(
          {
            status: "error",
            code: known ? error.code : "internal_error",
            message: known ? error.message : "UGO Actions MCP no pudo leer el historial",
          },
          true
        );
      }
    }
  );


  server.registerTool(
    "ugo_accept_job",
    {
      description:
        "Acepta una oferta exacta del proveedor usando serviceId + offerId explícitos y el RPC canónico aceptar_oferta. TEST-only hasta promover el contrato deuda/agenda a PROD.",
      inputSchema: z.object({
        userId: z.string().uuid(),
        role: z.literal("provider"),
        serviceId: z.string().uuid(),
        offerId: z.string().uuid(),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(await acceptJob(input));
      } catch (error) {
        const known = error instanceof UgoMcpError;
        return jsonToolResult(
          {
            status: "error",
            code: known ? error.code : "internal_error",
            message: known ? error.message : "UGO Actions MCP no pudo aceptar el trabajo",
          },
          true
        );
      }
    }
  );


  server.registerTool(
    "ugo_mark_arrived",
    {
      description:
        "Confirma YA LLEGUÉ para un serviceId exacto usando exclusivamente la última ubicación GPS real ya persistida y validación server-side. No acepta lat/lng del modelo.",
      inputSchema: z.object({
        userId: z.string().uuid(),
        role: z.literal("provider"),
        serviceId: z.string().uuid(),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(await markArrived(input));
      } catch (error) {
        const known = error instanceof UgoMcpError;
        return jsonToolResult(
          {
            status: "error",
            code: known ? error.code : "internal_error",
            message: known ? error.message : "UGO Actions MCP no pudo confirmar la llegada",
          },
          true
        );
      }
    }
  );

  return server;
});

console.error("UGO Actions MCP iniciado");
