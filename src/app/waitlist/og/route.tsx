import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { localeFromParam } from "@/lingui";
import type { AppLocale } from "@/lingui";
import { SMARTX_DEFAULT_SOCIAL_IMAGE_PATH } from "@/lib/site-metadata";
import { normalizeInviteCode } from "@/lib/waitlist/api";
import { shareOgCopy } from "@/lib/waitlist/share-copy";
import { decodeShareResult, sharePersonaImageUrl } from "@/lib/waitlist/share-result";

export const dynamic = "force-dynamic";

const COLORS = {
  canvas: "#010101",
  line: "#202020",
  text: "#ffffff",
  muted: "#747474",
  mint: "#08dfb5",
  quoteBox: "#121212",
};

const AXES = [
  { key: "conviction", labelKey: "conviction", fill: "#08dfb5", track: "rgba(8, 223, 181, 0.12)" },
  { key: "instinct", labelKey: "instinct", fill: "#a957d6", track: "rgba(169, 87, 214, 0.2)" },
  { key: "resilience", labelKey: "resilience", fill: "#f69002", track: "rgba(246, 144, 2, 0.14)" },
] as const;

const CJK_FONT_URL: Record<Exclude<AppLocale, "en">, string> = {
  "zh-CN": "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@5.2.8/chinese-simplified-500-normal.woff",
  ja: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@5.2.8/japanese-500-normal.woff",
  ko: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@5.2.8/korean-500-normal.woff",
};

const cjkFontCache = new Map<AppLocale, Promise<Buffer | null>>();

function loadCjkFont(locale: AppLocale) {
  if (locale === "en") return Promise.resolve(null);
  const cached = cjkFontCache.get(locale);
  if (cached) return cached;
  const pending = fetch(CJK_FONT_URL[locale])
    .then(async (response) => (response.ok ? Buffer.from(await response.arrayBuffer()) : null))
    .catch(() => null);
  cjkFontCache.set(locale, pending);
  return pending;
}

// 冷启动只读一次；satori 不认 woff2/可变字体，这些静态字体文件随仓库分发。
let assetsPromise: Promise<{
  plexRegular: Buffer;
  plexMedium: Buffer;
  plexSemibold: Buffer;
  plexBold: Buffer;
  playfairMedium: Buffer;
  lexendBold: Buffer;
  logoMark: string;
  quoteMark: string;
  traderTypeIcon: string;
  yziLabs: string;
}> | null = null;

function loadAssets() {
  assetsPromise ??= (async () => {
    const fontsDir = path.join(process.cwd(), "src/assets/fonts");
    const shareDir = path.join(process.cwd(), "src/assets/share");
    const [
      plexRegular,
      plexMedium,
      plexSemibold,
      plexBold,
      playfairMedium,
      lexendBold,
      logoSvg,
      quoteSvg,
      traderTypeSvg,
      yziPng,
    ] =
      await Promise.all([
        readFile(path.join(fontsDir, "ibm-plex-sans-latin-400-normal.woff")),
        readFile(path.join(fontsDir, "ibm-plex-sans-latin-500-normal.woff")),
        readFile(path.join(fontsDir, "ibm-plex-sans-latin-600-normal.woff")),
        readFile(path.join(fontsDir, "ibm-plex-sans-latin-700-normal.woff")),
        readFile(path.join(fontsDir, "PlayfairDisplay-500.ttf")),
        readFile(path.join(fontsDir, "Lexend-700.ttf")),
        readFile(path.join(shareDir, "logo-mark.svg")),
        readFile(path.join(shareDir, "quote.svg")),
        readFile(path.join(shareDir, "trader-type.svg")),
        readFile(path.join(shareDir, "yzilabs.png")),
      ]);
    return {
      plexRegular,
      plexMedium,
      plexSemibold,
      plexBold,
      playfairMedium,
      lexendBold,
      logoMark: `data:image/svg+xml;base64,${logoSvg.toString("base64")}`,
      quoteMark: `data:image/svg+xml;base64,${quoteSvg.toString("base64")}`,
      traderTypeIcon: `data:image/svg+xml;base64,${traderTypeSvg.toString("base64")}`,
      yziLabs: `data:image/png;base64,${yziPng.toString("base64")}`,
    };
  })();
  return assetsPromise;
}

function absoluteArtUrl(artSrc: string, origin: string) {
  if (artSrc.startsWith("/")) return `${origin}${artSrc}`;
  return artSrc;
}

async function loadPersonaArt(personaId: string, fallback: string, origin: string) {
  try {
    const response = await fetch(sharePersonaImageUrl(personaId), {
      headers: {
        Accept: "image/*",
        "User-Agent": "Mozilla/5.0 (compatible; SmartXWaitlistOG/1.0)",
      },
      cache: "force-cache",
    });
    if (!response.ok) throw new Error(String(response.status));
    const type = response.headers.get("content-type") || "image/png";
    if (!type.startsWith("image/")) throw new Error(type);
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return absoluteArtUrl(fallback, origin);
  }
}

/* eslint-disable @next/next/no-img-element -- satori 画布内只能用原生 img */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const locale = localeFromParam(request.nextUrl.searchParams.get("lang"));
  const parsed = decodeShareResult(request.nextUrl.searchParams.get("result"));
  if (!parsed) {
    return Response.redirect(new URL(SMARTX_DEFAULT_SOCIAL_IMAGE_PATH, origin), 302);
  }

  const invite = normalizeInviteCode(request.nextUrl.searchParams.get("invite") ?? "");
  const copy = shareOgCopy(parsed.persona, locale);
  const axisLabels = {
    conviction: copy.conviction,
    instinct: copy.instinct,
    resilience: copy.resilience,
  } as const;
  const artUrl = await loadPersonaArt(parsed.personaId, parsed.persona.artSrc, origin);
  const [assets, cjkFont] = await Promise.all([loadAssets(), loadCjkFont(locale)]);
  const bodyFont = cjkFont ? "Noto Sans" : "IBM Plex Sans";
  const titleFont = cjkFont ? "Noto Sans" : "Playfair Display";
  const cjkLayout = locale !== "en";
  const titleFontSize = cjkLayout ? (copy.name.length > 10 ? 44 : 56) : copy.name.length > 19 ? 52 : 64;
  const descriptionFontSize = copy.personaDescription.length > 155 ? 14 : 16;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: COLORS.canvas,
          color: COLORS.text,
          fontFamily: bodyFont,
        }}
      >
        {/* 顶部品牌栏：与 Figma 的 48px 安全边距保持一致。 */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 48,
            top: 27,
            width: 1104,
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 16,
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={assets.logoMark} alt="" width={34} height={27} />
            <span
              style={{
                fontFamily: "Lexend",
                fontWeight: 700,
                fontSize: 24.5,
                color: COLORS.mint,
              }}
            >
              SmartX
            </span>
          </div>
          <div
            style={{
              display: "flex",
              width: cjkLayout ? 540 : 385,
              justifyContent: "center",
              textAlign: "center",
              color: COLORS.muted,
              fontSize: 16,
              lineHeight: 1.3,
            }}
          >
            {copy.tagline}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ color: COLORS.muted, fontSize: 12 }}>{copy.backedBy}</span>
            <img src={assets.yziLabs} alt="" width={126} height={31} />
          </div>
        </div>

        {/* 人格名 */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 48,
            top: 102,
            width: 611,
            fontFamily: titleFont,
            fontWeight: 500,
            fontSize: titleFontSize,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            color: COLORS.text,
          }}
        >
          {copy.name}
        </div>

        {/* 人格立绘 */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 48,
            top: 241,
            width: 611,
            height: 288,
            borderRadius: 8,
            background: "#737373",
            overflow: "hidden",
          }}
        >
          <img
            src={artUrl}
            alt=""
            width={611}
            height={288}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* 三项得分 */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 702,
            top: 111,
            width: 450,
            flexDirection: "column",
            gap: 20,
          }}
        >
          {AXES.map((axis) => {
            const value = Math.max(0, Math.min(100, parsed.stats[axis.key]));
            return (
              <div key={axis.key} style={{ display: "flex", flexDirection: "column", gap: 4, width: 450 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: 450,
                    fontSize: 18,
                    lineHeight: 1.2,
                  }}
                >
                  <span style={{ color: COLORS.muted, fontWeight: 400 }}>{axisLabels[axis.labelKey]}</span>
                  <span style={{ color: COLORS.text, fontWeight: 600 }}>{value}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    width: 450,
                    height: 8,
                    borderRadius: 4,
                    overflow: "hidden",
                    background: axis.track,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: `${Math.max(value, 2)}%`,
                      height: 8,
                      borderRadius: 4,
                      background: axis.fill,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 一句话 roast */}
        {copy.roast ? (
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 702,
              top: 294,
              width: 450,
              height: 88,
              alignItems: "center",
              overflow: "visible",
              background: COLORS.quoteBox,
              borderRadius: 16,
              padding: 16,
              boxSizing: "border-box",
            }}
          >
            <img
              src={assets.quoteMark}
              alt=""
              width={40}
              height={33}
              style={{
                position: "absolute",
                top: -8,
                right: 9,
                transform: "rotate(180deg)",
              }}
            />
            <div
              style={{
                display: "flex",
                width: 402,
                paddingRight: 8,
                fontSize: cjkLayout ? 20 : 22,
                fontWeight: 500,
                lineHeight: 1.25,
                color: COLORS.text,
              }}
            >
              {copy.roast}
            </div>
          </div>
        ) : null}

        {/* 人格 description：下载海报和 X 的 SSR 预览共用这一处。 */}
        {copy.personaDescription ? (
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 702,
              top: 406,
              width: 450,
              height: 123,
              overflow: "hidden",
              flexDirection: "column",
              gap: 8,
              justifyContent: "center",
              padding: 16,
              boxSizing: "border-box",
              borderRadius: 16,
              background: "rgba(8, 223, 181, 0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: 418 }}>
              <img src={assets.traderTypeIcon} alt="" width={21} height={21} />
              <span style={{ color: COLORS.mint, fontSize: 16, fontWeight: 600, lineHeight: 1.2 }}>
                {copy.traderType}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                width: 418,
                color: "#d9d9d9",
                fontSize: descriptionFontSize,
                fontWeight: 400,
                lineHeight: 1.28,
              }}
            >
              {copy.personaDescription}
            </div>
          </div>
        ) : null}

        {/* 底部邀请码条 */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "space-between",
            width: 1200,
            padding: "20px 48px",
            background: "#ffffff",
            color: COLORS.canvas,
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          <div style={{ display: "flex", gap: 16 }}>
            <span>{copy.inviteCode}:</span>
            <span>{invite.toUpperCase() || "—"}</span>
          </div>
          <span>https://smartx.io/waitlist</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "IBM Plex Sans", data: assets.plexRegular, weight: 400, style: "normal" },
        { name: "IBM Plex Sans", data: assets.plexMedium, weight: 500, style: "normal" },
        { name: "IBM Plex Sans", data: assets.plexSemibold, weight: 600, style: "normal" },
        { name: "IBM Plex Sans", data: assets.plexBold, weight: 700, style: "normal" },
        { name: "Playfair Display", data: assets.playfairMedium, weight: 500, style: "normal" },
        { name: "Lexend", data: assets.lexendBold, weight: 700, style: "normal" },
        ...(cjkFont
          ? [
              { name: "Noto Sans", data: cjkFont, weight: 400 as const, style: "normal" as const },
              { name: "Noto Sans", data: cjkFont, weight: 500 as const, style: "normal" as const },
              { name: "Noto Sans", data: cjkFont, weight: 600 as const, style: "normal" as const },
              { name: "Noto Sans", data: cjkFont, weight: 700 as const, style: "normal" as const },
            ]
          : []),
      ],
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
