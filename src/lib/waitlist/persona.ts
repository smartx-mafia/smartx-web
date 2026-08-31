import { msg } from "@lingui/core/macro";
import type { MessageDescriptor } from "@lingui/core";

import { i18n, toAppLocale, type AppLocale } from "@/lingui";
import { i18nForLocale } from "@/lingui/for-locale";

import { resolveWaitlistAssetUrl } from "./api";
import type {
  ApiQuizQuestion,
  AttributeView,
  DimensionView,
  Outcome,
  Persona,
  PersonaRef,
  Pole,
  QuizQuestion,
  ResultCard,
  Stat,
} from "./types";

export const PERSONAS: Record<string, Persona> = {
  "DEGEN|GUT|PACK": {
    name: "The Liquidity Donor", cn: "散财童子", code: "APE", mark: "LQD",
    roast: "You’re not trading. You’re funding the ecosystem.",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/lqd-liquidity-donor.png",
    artAlt: "The Liquidity Donor handing cash to a rising candlestick market",
  },
  "DEGEN|GUT|LONE": {
    name: "The All-In Mystic", cn: "梭哈仙人", code: "WOLF", mark: "AIM",
    roast: "Every all-in starts with enlightenment and ends with reincarnation.",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/aim-all-in-mystic.png",
    artAlt: "The All-In Mystic meditating beside an all-in stack of chips",
  },
  "DEGEN|DATA|PACK": {
    name: "The Send-It Strategist", cn: "喊单军师", code: "PARROT", mark: "SIG",
    roast: "Three hours of research. Two-word thesis: send it.",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/sig-signal-general.png",
    artAlt: "The Send-It Strategist directing followers from a chart-covered strategy table",
  },
  "DEGEN|DATA|LONE": {
    name: "The Candle Prophet", cn: "画线半仙", code: "FOX", mark: "CND",
    roast: "You can chart every line except the one marking enough exposure.",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/cnd-candle-prophet.png",
    artAlt: "The Candle Prophet explaining charts beside an oversized position lever",
  },
  "SNIPER|GUT|PACK": {
    name: "The Dip Ringleader", cn: "接刀掌门", code: "TURTLE", mark: "DIP",
    roast: "You’re not buying the dip. You’re giving the downtrend a demo.",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/dip-dip-ringleader.png",
    artAlt: "The Dip Ringleader leading followers down a falling candlestick chart",
  },
  "SNIPER|GUT|LONE": {
    name: "The Vibes Doctor", cn: "行情老中医", code: "BEAR", mark: "DOC",
    roast: "Every symptom diagnosed. Every loss professionally explained.",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/doc-market-doctor.png",
    artAlt: "The Vibes Doctor listening to a candlestick chart with a stethoscope",
  },
  "SNIPER|DATA|PACK": {
    name: "The Onchain Paparazzi", cn: "链上狗仔", code: "WHALE", mark: "CHN",
    roast: "You know everyone’s position except, occasionally, your own.",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/chn-onchain-detective.png",
    artAlt: "The Onchain Paparazzi tracing wallets while ignoring its own losing trade",
  },
  "SNIPER|DATA|LONE": {
    name: "The Limit Sniper", cn: "挂单钉子户", code: "CAT", mark: "LMT",
    roast: "The limit order was perfect. Shame you two never met again.",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/lmt-limit-sniper.png",
    artAlt: "The Limit Sniper watching price turn just before reaching an entry line",
  },
  RSK: {
    name: "The Risk Monk", cn: "老阴阳人", code: "OWL", mark: "RSK",
    roast: "They study how to double once. You study how to stay in the game.",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/rsk-risk-monk.png",
    artAlt: "The Risk Monk meditating safely inside a shield during market chaos",
  },
};

export const PERSONAS_BY_CODE = Object.values(PERSONAS).reduce<Record<string, Persona>>((index, persona) => {
  index[persona.code] = persona;
  index[persona.mark] = persona;
  return index;
}, {});

// 人格文案的多语言目录（按 mark 索引）。API 提供 nameEn/nameZh/roastEn/roastZh；
// ko/ja 由本地目录补齐，API 空串时回退本地文案，未知人格回退 API 英文原文。
const PERSONA_L10N: Record<string, { name: MessageDescriptor; roast: MessageDescriptor }> = {
  LQD: {
    name: msg`The Liquidity Donor`,
    roast: msg`You’re not trading. You’re funding the ecosystem.`,
  },
  AIM: {
    name: msg`The All-In Mystic`,
    roast: msg`Every all-in starts with enlightenment and ends with reincarnation.`,
  },
  SIG: {
    name: msg`The Send-It Strategist`,
    roast: msg`Three hours of research. Two-word thesis: send it.`,
  },
  CND: {
    name: msg`The Candle Prophet`,
    roast: msg`You can chart every line except the one marking enough exposure.`,
  },
  DIP: {
    name: msg`The Dip Ringleader`,
    roast: msg`You’re not buying the dip. You’re giving the downtrend a demo.`,
  },
  DOC: {
    name: msg`The Vibes Doctor`,
    roast: msg`Every symptom diagnosed. Every loss professionally explained.`,
  },
  CHN: {
    name: msg`The Onchain Paparazzi`,
    roast: msg`You know everyone’s position except, occasionally, your own.`,
  },
  LMT: {
    name: msg`The Limit Sniper`,
    roast: msg`The limit order was perfect. Shame you two never met again.`,
  },
  RSK: {
    name: msg`The Risk Monk`,
    roast: msg`They study how to double once. You study how to stay in the game.`,
  },
};

function personaL10n(persona: Pick<Persona, "mark" | "code">) {
  return PERSONA_L10N[persona.mark] ?? PERSONA_L10N[persona.code];
}

export function personaCopyForLocale(
  persona: Pick<Persona, "name" | "cn" | "roast" | "roastZh" | "mark" | "code">,
  locale: AppLocale,
) {
  const catalog = i18nForLocale(locale);
  const entry = personaL10n(persona);
  const name =
    locale === "en"
      ? persona.name
      : locale === "zh-CN" && persona.cn
        ? persona.cn
        : entry
          ? catalog._(entry.name)
          : persona.name;
  if (!persona.roast) return { name, roast: "" };
  const roast =
    locale === "en"
      ? persona.roast
      : locale === "zh-CN" && persona.roastZh
        ? persona.roastZh
        : entry
          ? catalog._(entry.roast)
          : persona.roast;
  return { name, roast };
}

export function localizedPersonaName(persona: Persona): string {
  return personaCopyForLocale(persona, toAppLocale(i18n.locale)).name;
}

export function localizedPersonaRoast(persona: Persona): string {
  return personaCopyForLocale(persona, toAppLocale(i18n.locale)).roast;
}

const POLE_L10N: Record<Pole, MessageDescriptor> = {
  DEGEN: msg`DEGEN`,
  SNIPER: msg`SNIPER`,
  GUT: msg`GUT`,
  DATA: msg`DATA`,
  PACK: msg`PACK`,
  LONE: msg`LONE`,
};

export function localizedPole(pole: Pole): string {
  return i18n._(POLE_L10N[pole]);
}

const CHEMISTRY: Record<string, { best: string; rival: string }> = {
  LQD: { best: "DIP", rival: "LMT" }, AIM: { best: "DOC", rival: "CHN" },
  SIG: { best: "CHN", rival: "DOC" }, CND: { best: "LMT", rival: "DIP" },
  DIP: { best: "LQD", rival: "CND" }, DOC: { best: "AIM", rival: "SIG" },
  CHN: { best: "SIG", rival: "AIM" }, LMT: { best: "CND", rival: "LQD" },
  RSK: { best: "CHN", rival: "LQD" },
};

const SIDE_TO_POLE: Record<string, Pole> = {
  degen: "DEGEN",
  sniper: "SNIPER",
  gut: "GUT",
  data: "DATA",
  pack: "PACK",
  lone: "LONE",
};

const QUESTION_ART: Record<string, { src: string; alt: string }> = {
  art_r1: {
    src: "/assets/waitlist/question-1-v2.webp",
    alt: "The SmartX owl weighing whether to chase a 40 percent move at a launch platform",
  },
  art_r2: {
    src: "/assets/waitlist/question-2-v2.webp",
    alt: "The SmartX owl reacting as a spacecraft position moves sharply against it",
  },
  art_d1: {
    src: "/assets/waitlist/question-3-v2.webp",
    alt: "The SmartX owl comparing market analysis, social sentiment, wallet flow, and news",
  },
  art_d2: {
    src: "/assets/waitlist/question-4-v2.webp",
    alt: "The SmartX owl checking an unexpected signal before acting on it",
  },
  art_s1: {
    src: "/assets/waitlist/question-5-v2.webp",
    alt: "The SmartX owl deciding who to tell first after catching a ten-times trade",
  },
  art_s2: {
    src: "/assets/waitlist/question-6-v2.webp",
    alt: "The SmartX owl listening while a trading group challenges its decision",
  },
};

const QUESTION_ART_BY_INDEX = Object.values(QUESTION_ART);

export const QUIZ_ART_SRCS = QUESTION_ART_BY_INDEX.map((item) => item.src);

export const WAITLIST_VERIFICATION_ART_SRC =
  "/assets/waitlist/waitlist-verification-v2.webp";
export const WAITLIST_UNLOCK_ART_SRC =
  "/assets/waitlist/waitlist-unlock-v2.webp";

const prefetchedQuizArt = new Set<string>();

export function prefetchQuizArtwork(extraSrcs: readonly string[] = []) {
  if (typeof window === "undefined") return;
  for (const src of [...QUIZ_ART_SRCS, ...extraSrcs]) {
    if (!src || prefetchedQuizArt.has(src)) continue;
    prefetchedQuizArt.add(src);
    const image = new window.Image();
    image.decoding = "async";
    image.src = src;
    void image.decode?.().catch(() => undefined);
  }
}

if (typeof window !== "undefined") prefetchQuizArtwork();

export function hydrateQuestions(questions: ApiQuizQuestion[]): QuizQuestion[] {
  return questions.map((question, index) => {
    const art = QUESTION_ART[question.artworkKey] ?? QUESTION_ART_BY_INDEX[index] ?? QUESTION_ART.art_r1;
    return { ...question, artSrc: art.src, artAlt: art.alt };
  });
}

function fallbackPersona(personaId = "LQD"): Persona {
  return PERSONAS_BY_CODE[personaId] ?? PERSONAS_BY_CODE.LQD;
}

function polesForPersona(mark: string): readonly [Pole, Pole, Pole] {
  if (mark === "RSK") return ["SNIPER", "DATA", "LONE"];
  const entry = Object.entries(PERSONAS).find(([, persona]) => persona.mark === mark);
  if (entry?.[0].includes("|")) return entry[0].split("|") as [Pole, Pole, Pole];
  return ["DEGEN", "GUT", "PACK"];
}

function polesFromDimensions(dimensions: DimensionView[] | undefined, personaId: string): readonly [Pole, Pole, Pole] {
  const mapped = (dimensions ?? [])
    .map((item) => SIDE_TO_POLE[item.side?.toLowerCase() ?? ""])
    .filter((pole): pole is Pole => Boolean(pole));
  if (mapped.length === 3) return [mapped[0], mapped[1], mapped[2]];
  return polesForPersona(personaId);
}

function mapStats(attributes: AttributeView[] | undefined): Record<Stat, number> {
  const stats: Record<Stat, number> = { conviction: 50, instinct: 50, resilience: 50 };
  (attributes ?? []).forEach((item) => {
    if (item.key === "conviction" || item.key === "instinct" || item.key === "resilience") {
      stats[item.key] = item.value;
    }
  });
  return stats;
}

function mapPersona(personaId: string, overrides?: Partial<Persona> & { imageUrl?: string }): Persona {
  const fallback = fallbackPersona(personaId);
  return {
    name: overrides?.name || fallback.name,
    cn: overrides?.cn || fallback.cn,
    code: personaId || fallback.mark,
    mark: personaId || fallback.mark,
    roast: overrides?.roast || fallback.roast,
    roastZh: overrides?.roastZh || fallback.roastZh,
    artSrc: resolveWaitlistAssetUrl(overrides?.imageUrl || "") || overrides?.artSrc || fallback.artSrc,
    artAlt: overrides?.artAlt || fallback.artAlt,
  };
}

function mapPersonaRef(ref: PersonaRef | undefined, fallbackId: string): Persona {
  return mapPersona(ref?.personaId || fallbackId, {
    name: ref?.nameEn,
    cn: ref?.nameZh,
    imageUrl: ref?.imageUrl,
  });
}

export function mapCardToOutcome(card: ResultCard): Outcome {
  const persona = mapPersona(card.personaId, {
    name: card.nameEn,
    cn: card.nameZh,
    roast: card.roastEn,
    roastZh: card.roastZh,
    imageUrl: card.imageUrl,
  });
  const chemistry = CHEMISTRY[persona.mark] ?? CHEMISTRY.LQD;
  return {
    resultId: card.resultId,
    persona,
    poles: polesFromDimensions(card.dimensions, persona.mark),
    stats: mapStats(card.attributes),
    bestMatch: mapPersonaRef(card.bestMatch, chemistry.best),
    rival: mapPersonaRef(card.naturalRival, chemistry.rival),
  };
}
