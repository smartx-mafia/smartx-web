import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// 临时调试接口：定位 Vercel 服务端访问 waitlist API 失败的原因，确认后删除。
const API_BASE = process.env.NEXT_PUBLIC_WAITLIST_API_BASE ?? "https://waitlist-test-api.smartx.io";

async function probe(url: string, headers: Record<string, string>) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { headers, cache: "no-store" });
    const text = await response.text();
    return {
      ok: true,
      status: response.status,
      ms: Date.now() - startedAt,
      contentType: response.headers.get("content-type"),
      cfRay: response.headers.get("cf-ray"),
      server: response.headers.get("server"),
      bodyHead: text.slice(0, 200),
    };
  } catch (error) {
    return {
      ok: false,
      ms: Date.now() - startedAt,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      cause: error instanceof Error && error.cause ? String(error.cause) : undefined,
    };
  }
}

export async function GET(request: NextRequest) {
  const invite = request.nextUrl.searchParams.get("invite") ?? "l3p7u9t7";
  const target = `${API_BASE}/waitlist_public/result?inviteCode=${encodeURIComponent(invite)}`;

  const [plain, browserLike] = await Promise.all([
    probe(target, { Accept: "application/json" }),
    probe(target, {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    }),
  ]);

  return Response.json({
    apiBase: API_BASE,
    envOverride: Boolean(process.env.NEXT_PUBLIC_WAITLIST_API_BASE),
    vercelRegion: process.env.VERCEL_REGION ?? null,
    plain,
    browserLike,
  });
}
