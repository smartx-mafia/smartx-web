import type { shareOgCopy } from "@/lib/waitlist/share-copy";

const AXES = [
  { key: "conviction", fill: "#08dfb5", track: "#082c24" },
  { key: "instinct", fill: "#a957d6", track: "#291732" },
  { key: "resilience", fill: "#f69002", track: "#2d1d06" },
] as const;

/** Portrait download. Layout follows Figma 24771:42242; X / Twitter cards stay on the landscape route. */
export function StoryCard({
  copy,
  artUrl,
  invite,
  bodyFont,
  titleFont,
  logo,
  yziLabs,
  quote,
  stats,
  cjk,
}: {
  copy: ReturnType<typeof shareOgCopy>;
  artUrl: string;
  invite: string;
  bodyFont: string;
  titleFont: string;
  logo: string;
  yziLabs: string;
  quote: string;
  stats: { conviction: number; instinct: number; resilience: number };
  cjk?: boolean;
}) {
  const longName = copy.name.length > 20;
  const titleSize = cjk ? (copy.name.length > 8 ? 80 : 96) : longName ? 86 : 104;
  const roastLong = copy.roast.length > 52;
  const roastSize = roastLong ? 36 : 44;
  const descriptionLong = copy.personaDescription.length > 140;
  const descriptionSize = descriptionLong ? 30 : 36;
  const code = invite.toUpperCase() || "—";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#010101",
        color: "#ffffff",
        fontFamily: bodyFont,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 1080,
          height: 530,
          padding: "120px 72px 0",
          gap: 48,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 936, gap: 24 }}>
          <div
            style={{
              display: "flex",
              width: 936,
              height: 97,
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" width={70} height={57} />
              <span style={{ fontFamily: "Lexend", fontWeight: 700, fontSize: 51, color: "#08dfb5", lineHeight: 1 }}>
                SmartX
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, width: 209 }}>
              <span style={{ fontSize: 24, lineHeight: "30px", color: "#a3a3a3" }}>{copy.backedBy}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={yziLabs} alt="" width={209} height={51} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: 936,
              height: 80,
              fontSize: 30,
              lineHeight: "40px",
              color: "#b3b3b3",
              fontWeight: 400,
            }}
          >
            {copy.tagline}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            width: 936,
            fontFamily: titleFont,
            fontWeight: 500,
            fontSize: titleSize,
            lineHeight: 1.2,
            color: "#ffffff",
          }}
        >
          {copy.name}
        </div>
      </div>

      <div style={{ display: "flex", width: 1080, height: 558, position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artUrl}
          alt=""
          width={1080}
          height={510}
          style={{ position: "absolute", left: 0, top: 24, width: 1080, height: 510, objectFit: "cover" }}
        />
      </div>

      <div
        style={{
          display: "flex",
          width: 1080,
          height: 160,
          padding: "24px 72px 0",
          gap: 36,
        }}
      >
        {AXES.map((axis) => {
          const value = Math.max(0, Math.min(100, stats[axis.key]));
          return (
            <div key={axis.key} style={{ display: "flex", flexDirection: "column", width: 288, gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  width: 288,
                  height: 52,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 30, color: "#b3b3b3", fontWeight: 400 }}>{copy[axis.key]}</span>
                <span style={{ fontSize: 40, color: "#ffffff", fontWeight: 600 }}>{value}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  width: 288,
                  height: 10,
                  borderRadius: 4,
                  overflow: "hidden",
                  background: axis.track,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: `${Math.max(value, 2)}%`,
                    height: 10,
                    borderRadius: 4,
                    background: axis.fill,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", width: 1080, height: 384, padding: "0 72px", position: "relative" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 936,
            padding: 32,
            gap: 20,
            borderRadius: 20,
            background: "#121212",
            position: "relative",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={quote}
            alt=""
            width={48}
            height={40}
            style={{ position: "absolute", top: -12, right: 32, transform: "rotate(180deg)" }}
          />
          {copy.roast ? (
            <div
              style={{
                display: "flex",
                width: 852,
                fontSize: roastSize,
                fontWeight: 500,
                lineHeight: roastLong ? "48px" : "58px",
                color: "#ffffff",
              }}
            >
              {copy.roast}
            </div>
          ) : null}
          {copy.personaDescription ? (
            <div
              style={{
                display: "flex",
                width: 872,
                fontSize: descriptionSize,
                fontWeight: 400,
                lineHeight: descriptionLong ? "40px" : "48px",
                color: "#b3b3b3",
              }}
            >
              {copy.personaDescription}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 1080,
          height: 288,
          padding: "28px 72px 0",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 44, fontWeight: 600, lineHeight: "58px", color: "#08dfb5" }}>{copy.storyPrompt}</span>
        <div
          style={{
            display: "flex",
            width: 936,
            height: 42,
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 34,
            fontWeight: 500,
          }}
        >
          <span style={{ color: "#b3b3b3" }}>
            {copy.storyInviteCode}: {code}
          </span>
          <span style={{ color: "#ffffff" }}>smartx.io/waitlist</span>
        </div>
      </div>
    </div>
  );
}
