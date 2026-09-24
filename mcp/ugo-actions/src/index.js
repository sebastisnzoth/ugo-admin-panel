import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

serveStdio(() => {
  const server = new McpServer({
    name: "ugo-actions",
    version: "0.1.0",
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
        "Stub seguro de lectura. Devuelve una respuesta de prueba hasta conectar el backend real de UGO.",
      inputSchema: z.object({
        userId: z.string().min(1),
      }),
    },
    async ({ userId }) => ({
      content: [
        {
          type: "text",
          text: `Consulta preparada para usuario ${userId}. Backend real todavía no conectado.`,
        },
      ],
    })
  );

  return server;
});

console.error("UGO Actions MCP iniciado");
