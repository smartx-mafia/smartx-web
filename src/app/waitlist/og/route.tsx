import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { loadInviterShareCard } from "@/lib/waitlist/public-share";

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
  { key: "conviction", label: "Conviction", fill: "#08dfb5", track: "rgba(8, 223, 181, 0.12)" },
  { key: "instinct", label: "Instinct", fill: "#a957d6", track: "rgba(169, 87, 214, 0.2)" },
  { key: "resilience", label: "Resilience", fill: "#f69002", track: "rgba(246, 144, 2, 0.14)" },
] as const;

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
  yziLabs: string;
}> | null = null;

function loadAssets() {
  assetsPromise ??= (async () => {
    const fontsDir = path.join(process.cwd(), "src/assets/fonts");
    const shareDir = path.join(process.cwd(), "src/assets/share");
    const [plexRegular, plexMedium, plexSemibold, plexBold, playfairMedium, lexendBold, logoSvg, quoteSvg, yziPng] =
      await Promise.all([
        readFile(path.join(fontsDir, "ibm-plex-sans-latin-400-normal.woff")),
        readFile(path.join(fontsDir, "ibm-plex-sans-latin-500-normal.woff")),
        readFile(path.join(fontsDir, "ibm-plex-sans-latin-600-normal.woff")),
        readFile(path.join(fontsDir, "ibm-plex-sans-latin-700-normal.woff")),
        readFile(path.join(fontsDir, "PlayfairDisplay-500.ttf")),
        readFile(path.join(fontsDir, "Lexend-700.ttf")),
        readFile(path.join(shareDir, "logo-mark.svg")),
        readFile(path.join(shareDir, "quote.svg")),
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
      yziLabs: `data:image/png;base64,${yziPng.toString("base64")}`,
    };
  })();
  return assetsPromise;
}

/* eslint-disable @next/next/no-img-element -- satori 画布内只能用原生 img */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const card = await loadInviterShareCard(request.nextUrl.searchParams.get("invite"));
  if (!card) {
    return Response.redirect(new URL("/opengraph-image.png", origin), 302);
  }

  const artUrl = card.artSrc.startsWith("/") ? `${origin}${card.artSrc}` : card.artSrc;
  const assets = await loadAssets();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: COLORS.canvas,
          color: COLORS.text,
          fontFamily: '"IBM Plex Sans"',
        }}
      >
        {/* 顶部品牌栏 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "27px 48px 0",
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
              width: 385,
              justifyContent: "center",
              textAlign: "center",
              color: COLORS.muted,
              fontSize: 16,
              lineHeight: 1.3,
            }}
          >
            The personalized social trading app for memes, perps, stocks and prediction markets.
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ color: COLORS.muted, fontSize: 12 }}>Backed by</span>
            <img src={assets.yziLabs} alt="" width={126} height={31} />
          </div>
        </div>

        {/* 人格名 */}
        <div
          style={{
            display: "flex",
            margin: "20px 48px 0",
            fontFamily: '"Playfair Display"',
            fontWeight: 500,
            fontSize: 64,
            lineHeight: "83px",
            color: COLORS.text,
          }}
        >
          {card.name}
        </div>

        {/* 立绘 + 属性/语录 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            margin: "38px 48px 0",
            height: 288,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 611,
              height: 288,
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 450,
              height: 288,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {AXES.map((axis) => {
                const value = Math.max(0, Math.min(100, card.stats[axis.key]));
                return (
                  <div key={axis.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 18,
                      }}
                    >
                      <span style={{ color: COLORS.muted, fontWeight: 400 }}>{axis.label}</span>
                      <span style={{ color: COLORS.text, fontWeight: 600 }}>{value}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        height: 8,
                        borderRadius: 4,
                        background: axis.track,
                      }}
                    >
                      <div
                        style={{
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

            {card.roast ? (
              <div
                style={{
                  display: "flex",
                  position: "relative",
                  background: COLORS.quoteBox,
                  borderRadius: 16,
                  padding: "16px 24px",
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
                    fontSize: 22,
                    fontWeight: 500,
                    lineHeight: 1.3,
                    color: COLORS.text,
                    maxHeight: 116,
                    overflow: "hidden",
                  }}
                >
                  {card.roast}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex" }} />

        {/* 底部邀请码条 */}
        <div
          style={{
            display: "flex",
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
            <span>Invitation code:</span>
            <span>{card.invite.toUpperCase()}</span>
          </div>
          <span>{`${origin}/waitlist`}</span>
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
      ],
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
