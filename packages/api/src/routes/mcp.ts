import type { FastifyInstance } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { requireAuth } from "../middleware/auth.js";
import { atlasContextStore } from "../mcp/context.js";
import { createMcpServer } from "../mcp/server.js";

export async function mcpRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/mcp",
    { preHandler: requireAuth },
    async (request, reply) => {
      const server = createMcpServer();
      // Omit sessionIdGenerator entirely for stateless mode
      const transport = new StreamableHTTPServerTransport({});

      // Yield full control of the socket — Fastify must not write its own response
      reply.hijack();

      try {
        // Cast needed: SDK's Transport interface uses exactOptionalPropertyTypes
        // incompatible with our tsconfig, but runtime behaviour is correct.
        await server.connect(transport as unknown as Transport);
        await atlasContextStore.run(
          { user: request.user! },
          () => transport.handleRequest(request.raw, reply.raw, request.body)
        );
      } finally {
        reply.raw.on("close", () => {
          void transport.close();
          void server.close();
        });
      }
    }
  );
}
