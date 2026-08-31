import "server-only";

import { headers } from "next/headers";

/** 当前请求的部署源（preview/生产/本地都指向自身），用于拼 OG 图等绝对地址。 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "https://smartx.io";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
