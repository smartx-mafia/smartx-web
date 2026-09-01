import { toAppLocale } from "@/lingui";

import { normalizeInviteCode } from "./api";
import { PERSONAS_BY_CODE } from "./persona";
import type { Persona, Stat } from "./types";

/** 分享码里的人格段，与 info 接口 `personaId` 一致。 */
export const SHARE_PERSONA_MARKS = [
  "LQD",
  "AIM",
  "SIG",
  "CND",
  "DIP",
  "DOC",
  "CHN",
  "LMT",
  "RSK",
] as const;

export type SharePersonaMark = (typeof SHARE_PERSONA_MARKS)[number];

export type ShareResultPayload = {
  personaId: SharePersonaMark;
  persona: Persona;
  stats: Record<Stat, number>;
};

const WAITLIST_STATIC_BASE = "https://static.smartx.io/waitlist";
const RESULT_PATTERN = /^([a-z]{3})(\d{6})$/i;

/**
 * 分享页和海报的缓存版本。变更海报视觉或文案结构时递增，确保 X 等平台
 * 抓取的是新预览；旧分享链接仍可继续解析。
 */
export const WAITLIST_SHARE_CARD_VERSION = "2";

function encodeStat(value: number): string {
  const n = Math.max(0, Math.min(99, Math.round(Number.isFinite(value) ? value : 0)));
  return String(n).padStart(2, "0");
}

function decodeStat(pair: string): number {
  const n = Number.parseInt(pair, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(99, n)) : 0;
}

function isSharePersonaMark(value: string): value is SharePersonaMark {
  return (SHARE_PERSONA_MARKS as readonly string[]).includes(value);
}

export function resolveSharePersonaId(personaId: string | null | undefined): SharePersonaMark | null {
  const raw = (personaId ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (isSharePersonaMark(upper)) return upper;
  const resolved = PERSONAS_BY_CODE[upper] ?? PERSONAS_BY_CODE[raw];
  return resolved && isSharePersonaMark(resolved.mark) ? resolved.mark : null;
}

/** info 的 personaId 小写 + `_1`，对应 CDN 人格卡立绘。 */
export function sharePersonaImageUrl(personaId: string): string {
  return `${WAITLIST_STATIC_BASE}/${personaId.trim().toLowerCase()}_1.png`;
}

export function encodeShareResult(
  personaId: string | Pick<Persona, "mark" | "code"> | null | undefined,
  stats: Record<Stat, number>,
): string | null {
  const raw = typeof personaId === "string" || personaId == null ? personaId : personaId.mark || personaId.code;
  const mark = resolveSharePersonaId(raw);
  if (!mark) return null;
  return `${mark.toLowerCase()}${encodeStat(stats.conviction)}${encodeStat(stats.instinct)}${encodeStat(stats.resilience)}`;
}

export function decodeShareResult(raw: string | null | undefined): ShareResultPayload | null {
  const value = (raw ?? "").trim();
  const matched = RESULT_PATTERN.exec(value);
  if (!matched) return null;
  const mark = resolveSharePersonaId(matched[1]);
  const persona = mark ? PERSONAS_BY_CODE[mark] : undefined;
  if (!mark || !persona) return null;
  const digits = matched[2];
  return {
    personaId: mark,
    persona,
    stats: {
      conviction: decodeStat(digits.slice(0, 2)),
      instinct: decodeStat(digits.slice(2, 4)),
      resilience: decodeStat(digits.slice(4, 6)),
    },
  };
}

/** 分享页与 OG 图共用的查询串：invite + lang（含 en）+ result + 版本。 */
export function waitlistShareQuery(input: {
  invite?: string | null;
  result: string;
  locale?: string | null;
}): URLSearchParams {
  const query = new URLSearchParams();
  const invite = normalizeInviteCode(input.invite ?? "");
  if (invite) query.set("invite", invite);
  query.set("lang", toAppLocale(input.locale));
  query.set("result", input.result);
  query.set("v", WAITLIST_SHARE_CARD_VERSION);
  return query;
}
