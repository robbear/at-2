import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  // Cron routes skip Basic Auth — Vercel validates them via Authorization: Bearer CRON_SECRET
  if (request.nextUrl.pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  const password = process.env.PORTAL_PASSWORD;

  if (!password) {
    return new NextResponse("Portal password not configured", { status: 503 });
  }

  // btoa is available in Edge Runtime; password must be ASCII
  const expected = `Basic ${btoa(`admin:${password}`)}`;
  if (authHeader !== expected) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Atlasphere Dashboard"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
