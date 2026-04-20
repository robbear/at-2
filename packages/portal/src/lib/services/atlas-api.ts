import { createHash } from "crypto";

const ATLAS_API = "https://cloud.mongodb.com/api/atlas/v2";
const ATLAS_ACCEPT = "application/vnd.atlas.2024-11-13+json";

export { ATLAS_API };

/**
 * HTTP Digest authentication fetch for the Atlas Admin API.
 * Docs: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
 */
export async function digestFetch(
  url: string,
  publicKey: string,
  privateKey: string,
): Promise<Response> {
  const probe = await fetch(url, {
    headers: { Accept: ATLAS_ACCEPT },
    cache: "no-store",
  });

  if (probe.status !== 401) return probe;

  const wwwAuth = probe.headers.get("www-authenticate") ?? "";
  const realm = /realm="([^"]+)"/.exec(wwwAuth)?.[1] ?? "";
  const nonce = /nonce="([^"]+)"/.exec(wwwAuth)?.[1] ?? "";
  const qop = /qop="?([^",\s]+)"?/.exec(wwwAuth)?.[1] ?? "";

  const cnonce = createHash("md5").update(String(Math.random())).digest("hex");
  const nc = "00000001";
  const uri = new URL(url).pathname + new URL(url).search;

  const ha1 = createHash("md5").update(`${publicKey}:${realm}:${privateKey}`).digest("hex");
  const ha2 = createHash("md5").update(`GET:${uri}`).digest("hex");
  const responseHash = createHash("md5")
    .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    .digest("hex");

  const authHeader =
    `Digest username="${publicKey}", realm="${realm}", nonce="${nonce}", ` +
    `uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${responseHash}"`;

  return fetch(url, {
    headers: { Authorization: authHeader, Accept: ATLAS_ACCEPT },
    cache: "no-store",
  });
}
