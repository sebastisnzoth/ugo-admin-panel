import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { getCurrentJob, UgoMcpError } from "./currentJob.js";

function jsonToolResult(payload, isError = false) {
  return {
    ...(isError ? { isError: true } : {}),
    content: [{ type: "text", text: JSON.stringify(payload) }],
  };
}

serveStdio(() => {
  const server = new McpServer({
    name: "ugo-actions",
    version: "0.2.0",
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

  return server;
});

console.error("UGO Actions MCP iniciado");
