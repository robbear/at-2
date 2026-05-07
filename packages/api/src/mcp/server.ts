import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCreateMarker } from "./tools/create-marker.js";
import { registerUpdateMarker } from "./tools/update-marker.js";
import { registerDeleteMarker } from "./tools/delete-marker.js";
import { registerSearchMarkers } from "./tools/search-markers.js";
import { registerUploadImageFromUrl } from "./tools/upload-image-from-url.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "atlasphere", version: "1.0.0" });

  registerCreateMarker(server);
  registerUpdateMarker(server);
  registerDeleteMarker(server);
  registerSearchMarkers(server);
  registerUploadImageFromUrl(server);

  return server;
}
