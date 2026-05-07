import { AsyncLocalStorage } from "node:async_hooks";
import type { SessionUser } from "../middleware/auth.js";

export interface AtlasContext {
  user: SessionUser;
}

export const atlasContextStore = new AsyncLocalStorage<AtlasContext>();

// Fallback for the stdio entry point, which runs as a single-user process.
// The stdio transport fires stdin events outside the AsyncLocalStorage scope,
// so we store the context here as a process-lifetime fallback.
// Never set by the HTTP path — AsyncLocalStorage handles that case.
let _stdioContext: AtlasContext | undefined;

export function setStdioContext(ctx: AtlasContext): void {
  _stdioContext = ctx;
}

export function getAtlasContext(): AtlasContext {
  const ctx = atlasContextStore.getStore() ?? _stdioContext;
  if (!ctx) throw new Error("MCP tool called outside request context");
  return ctx;
}
