import type { shareOgCopy } from "@/lib/waitlist/share-copy";

/** Portrait download uses the same result, localized copy and assets as X. */
export function StoryCard({ copy, artUrl, invite, bodyFont, titleFont, logo, yziLabs, quote, stats }: {
  copy: ReturnType<typeof shareOgCopy>; artUrl: string; invite: string; bodyFont: string; titleFont: string;
  logo: string; yziLabs: string; quote: string; stats: { conviction: number; instinct: number; resilience: number };
}) {
  return <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "100px 64px", background: "#010101", color: "#f5f5f5", fontFamily: bodyFont }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={60} height={48} /><span style={{ fontFamily: "Lexend", fontSize: 48, fontWeight: 700, color: "#08dfb5" }}>SmartX</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <span style={{ fontSize: 22, color: "#a6a6a6" }}>{copy.backedBy}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={yziLabs} alt="" width={200} height={49} />
      </div>
    </div>
    <div style={{ display: "flex", marginTop: 44, fontSize: 28, lineHeight: 1.4, color: "#a6a6a6" }}>{copy.tagline}</div>
    <div style={{ display: "flex", marginTop: 64, fontFamily: titleFont, fontSize: copy.name.length > 24 ? 64 : 78, lineHeight: 1.2, fontWeight: 500 }}>{copy.name}</div>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={artUrl} alt="" width={952} height={449} style={{ marginTop: 40, borderRadius: 12, objectFit: "cover" }} />
    <div style={{ display: "flex", gap: 32, marginTop: 40 }}>
      {(["conviction", "instinct", "resilience"] as const).map((axis, index) => <div key={axis} style={{ display: "flex", flexDirection: "column", width: 296, gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}><span style={{ color: "#a6a6a6" }}>{copy[axis]}</span><span>{stats[axis]}</span></div>
        <div style={{ display: "flex", height: 8, borderRadius: 4, background: "#242424" }}><div style={{ width: `${Math.max(0, Math.min(100, stats[axis]))}%`, height: 8, borderRadius: 4, background: ["#08dfb5", "#a957d6", "#f69002"][index] }} /></div>
      </div>)}
    </div>
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 28, marginTop: 44, padding: 36, borderRadius: 24, background: "#121212" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={quote} alt="" width={48} height={40} style={{ position: "absolute", top: 28, right: 28, transform: "rotate(180deg)" }} />
      <div style={{ display: "flex", paddingRight: 48, fontSize: 36, fontWeight: 500, lineHeight: 1.35 }}>{copy.roast}</div>
      <div style={{ display: "flex", fontSize: 28, lineHeight: 1.45, color: "#a6a6a6" }}>{copy.personaDescription}</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: "auto", paddingTop: 40, fontSize: 30 }}>
      <span style={{ color: "#08dfb5" }}>{copy.inviteCode}: {invite.toUpperCase() || "—"}</span>
      <span style={{ color: "#a6a6a6", fontSize: 26 }}>smartx.io/waitlist</span>
    </div>
  </div>;
}
