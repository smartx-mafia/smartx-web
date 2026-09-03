import { msg } from "@lingui/core/macro";
import type { MessageDescriptor } from "@lingui/core";

import { i18n, toAppLocale, type AppLocale } from "@/lingui";
import { i18nForLocale } from "@/lingui/for-locale";

import type {
  ApiQuizQuestion,
  AttributeView,
  Outcome,
  Persona,
  Pole,
  QuizQuestion,
  ResultCard,
  Stat,
} from "./types";

export const PERSONAS: Record<string, Persona> = {
  "DEGEN|GUT|PACK": {
    name: "The Liquidity Donor", cn: "散财童子", code: "APE", mark: "LQD",
    roast: "You’re not trading. You’re funding the ecosystem.",
    roastZh: "你不是在交易，你是在资助整个生态。",
    description: "Green candle, loud timeline, instant entry—and the group chat comes with you. Whenever the market needs exit liquidity, your wallet volunteers.",
    descriptionZh: "行情一热就上，气氛一到就冲，还喜欢拉着朋友一起。市场哪里缺流动性，哪里就容易出现你。",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/lqd-liquidity-donor.png",
    artAlt: "The Liquidity Donor handing cash to a rising candlestick market",
  },
  "DEGEN|GUT|LONE": {
    name: "The All-In Mystic", cn: "梭哈仙人", code: "WOLF", mark: "AIM",
    roast: "Every all-in starts with enlightenment and ends with reincarnation.",
    roastZh: "每次梭哈都始于顿悟，终于轮回。",
    description: "No data, no consensus, no problem. You trade the vibe, call it conviction, and reach enlightenment one block before reincarnation.",
    descriptionZh: "不看数据，也不等人点头。别人下单靠表，你下单靠「我悟了」。每次梭哈前都觉得自己开了天眼，下一秒就开始轮回。",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/aim-all-in-mystic.png",
    artAlt: "The All-In Mystic meditating beside an all-in stack of chips",
  },
  "DEGEN|DATA|PACK": {
    name: "The Alpha Caller", cn: "喊单军师", code: "PARROT", mark: "SIG",
    roast: "Three hours of research. Two-word thesis: send it.",
    roastZh: "研究三小时，结论两个字：冲了。",
    description: "You check charts, trace wallets, and read the thread—then reduce the thesis to: send it. Good alpha hits the group chat before candle close.",
    descriptionZh: "图也看了，钱包也查了，帖也读了。分析像军师，结论只有两个字：冲了。好机会你不能一个人上，必须叫上大家。",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/sig-signal-general.png",
    artAlt: "The Alpha Caller directing followers from a chart-covered strategy table",
  },
  "DEGEN|DATA|LONE": {
    name: "The Candle Prophet", cn: "K线半仙", code: "FOX", mark: "CND",
    roast: "You can chart every line except the one marking enough exposure.",
    roastZh: "你能画出每一根线，唯独画不出仓位该收手的那根。",
    description: "Your chart has more lines than a subway map. You trust structure over chatter—until leverage turns position sizing into a creative discipline.",
    descriptionZh: "图上的线比地铁图还密。你信结构，不信群聊。支撑、阻力、趋势都有体系，唯独仓位大小一加杠杆就靠即兴。",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/cnd-candle-prophet.png",
    artAlt: "The Candle Prophet explaining charts beside an oversized position lever",
  },
  "SNIPER|GUT|PACK": {
    name: "The Dip Ringleader", cn: "抄底团长", code: "TURTLE", mark: "DIP",
    roast: "You’ll catch every knife. You’ll never finish the bottom.",
    roastZh: "没有你接不住的刀，只有永远抄不完的底。",
    description: "You wait for red candles and call it opportunity. The first bid is instinct; the next three are “better entries,” with the group chat following.",
    descriptionZh: "你专等绿盘变红，并管它叫机会。第一笔靠感觉，后面三笔叫「更好的入场」，还不忘喊群友一起抄。",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/dip-dip-ringleader.png",
    artAlt: "The Dip Ringleader leading followers down a falling candlestick chart",
  },
  "SNIPER|GUT|LONE": {
    name: "The Vibes Doctor", cn: "行情老中医", code: "BEAR", mark: "DOC",
    roast: "Every symptom diagnosed. Every loss professionally explained.",
    roastZh: "每个症状都能诊断，每笔亏损都有专业解释。",
    description: "You diagnose the market from one look at the tape. Indicators are lab results; the final call is vibes, and every loss gets a clean post-mortem.",
    descriptionZh: "行情看一眼就能号脉。指标是化验单，下结论靠手感，亏了也能写出一份完整病历。",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/doc-market-doctor.png",
    artAlt: "The Vibes Doctor listening to a candlestick chart with a stethoscope",
  },
  "SNIPER|DATA|PACK": {
    name: "The Onchain Paparazzi", cn: "链上狗仔", code: "WHALE", mark: "CHN",
    roast: "Paparazzi for the whole chain. Blind spot: your pocket.",
    roastZh: "整条链你都在监控跟拍，除了自己的钱包。",
    description: "Charts, flows, smart-money wallets—you track it all onchain. Your own entries stay careful; everyone else’s bags and suspicious transfers become public gossip.",
    descriptionZh: "图表、资金流、聪明钱钱包，链上全都追。自己进场很谨慎；别人的套牢和异常转账，你倒是第一时间给爆出来。",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/chn-onchain-detective.png",
    artAlt: "The Onchain Paparazzi tracing wallets while ignoring its own losing trade",
  },
  "SNIPER|DATA|LONE": {
    name: "The Limit Sniper", cn: "挂单钉子户", code: "CAT", mark: "LMT",
    roast: "The limit order was perfect. Shame you two never met.",
    roastZh: "那张限价单无可挑剔，可惜从未成交。",
    description: "You place the perfect bid one tick below destiny and wait. Missing the trade is acceptable; paying market is not.",
    descriptionZh: "你相信好交易从来不是追出来的。价格不到位，宁愿错过也不出手，一张限价单能从熊市挂到牛市。",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/lmt-limit-sniper.png",
    artAlt: "The Limit Sniper watching price turn just before reaching an entry line",
  },
  RSK: {
    name: "The Risk Monk", cn: "风控大师", code: "OWL", mark: "RSK",
    roast: "They study how to double once. You study how to stay in the game.",
    roastZh: "别人想一把翻倍，你只想稳稳留在牌桌上。",
    description: "While everyone hunts the next 10x, you check size, invalidation, and tomorrow’s bankroll. You plan to stay seated when the next cycle starts.",
    descriptionZh: "别人在找下一个 10 倍，你在看仓位、失效条件和明天还能不能开盘。你的计划是：下一轮开始时，你还坐在桌上。",
    artSrc: "/assets/waitlist/personas/ops-meme-v1/rsk-risk-monk.png",
    artAlt: "The Risk Monk meditating safely inside a shield during market chaos",
  },
};

export const PERSONAS_BY_CODE = Object.values(PERSONAS).reduce<Record<string, Persona>>((index, persona) => {
  index[persona.code] = persona;
  index[persona.mark] = persona;
  return index;
}, {});

// 人格文案的多语言目录（按 mark / personaId 索引），展示只认本地目录。
const PERSONA_L10N: Record<string, { name: MessageDescriptor; roast: MessageDescriptor; description: MessageDescriptor }> = {
  LQD: {
    name: msg`The Liquidity Donor`,
    roast: msg`You’re not trading. You’re funding the ecosystem.`,
    description: msg`Green candle, loud timeline, instant entry—and the group chat comes with you. Whenever the market needs exit liquidity, your wallet volunteers.`,
  },
  AIM: {
    name: msg`The All-In Mystic`,
    roast: msg`Every all-in starts with enlightenment and ends with reincarnation.`,
    description: msg`No data, no consensus, no problem. You trade the vibe, call it conviction, and reach enlightenment one block before reincarnation.`,
  },
  SIG: {
    name: msg`The Alpha Caller`,
    roast: msg`Three hours of research. Two-word thesis: send it.`,
    description: msg`You check charts, trace wallets, and read the thread—then reduce the thesis to: send it. Good alpha hits the group chat before candle close.`,
  },
  CND: {
    name: msg`The Candle Prophet`,
    roast: msg`You can chart every line except the one marking enough exposure.`,
    description: msg`Your chart has more lines than a subway map. You trust structure over chatter—until leverage turns position sizing into a creative discipline.`,
  },
  DIP: {
    name: msg`The Dip Ringleader`,
    roast: msg`You’ll catch every knife. You’ll never finish the bottom.`,
    description: msg`You wait for red candles and call it opportunity. The first bid is instinct; the next three are “better entries,” with the group chat following.`,
  },
  DOC: {
    name: msg`The Vibes Doctor`,
    roast: msg`Every symptom diagnosed. Every loss professionally explained.`,
    description: msg`You diagnose the market from one look at the tape. Indicators are lab results; the final call is vibes, and every loss gets a clean post-mortem.`,
  },
  CHN: {
    name: msg`The Onchain Paparazzi`,
    roast: msg`Paparazzi for the whole chain. Blind spot: your pocket.`,
    description: msg`Charts, flows, smart-money wallets—you track it all onchain. Your own entries stay careful; everyone else’s bags and suspicious transfers become public gossip.`,
  },
  LMT: {
    name: msg`The Limit Sniper`,
    roast: msg`The limit order was perfect. Shame you two never met.`,
    description: msg`You place the perfect bid one tick below destiny and wait. Missing the trade is acceptable; paying market is not.`,
  },
  RSK: {
    name: msg`The Risk Monk`,
    roast: msg`They study how to double once. You study how to stay in the game.`,
    description: msg`While everyone hunts the next 10x, you check size, invalidation, and tomorrow’s bankroll. You plan to stay seated when the next cycle starts.`,
  },
};

function personaL10n(persona: Pick<Persona, "mark" | "code">) {
  return PERSONA_L10N[persona.mark] ?? PERSONA_L10N[persona.code];
}

export function personaCopyForLocale(
  persona: Pick<Persona, "name" | "cn" | "roast" | "roastZh" | "mark" | "code"> &
    Partial<Pick<Persona, "description" | "descriptionZh">>,
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
  const roast =
    !persona.roast
      ? ""
      : locale === "en"
      ? persona.roast
      : locale === "zh-CN" && persona.roastZh
        ? persona.roastZh
        : entry
          ? catalog._(entry.roast)
          : persona.roast;
  const description =
    !persona.description
      ? ""
      : locale === "en"
        ? persona.description
        : locale === "zh-CN" && persona.descriptionZh
          ? persona.descriptionZh
          : entry
            ? catalog._(entry.description)
            : persona.description;
  return { name, roast, description };
}

export function localizedPersonaName(persona: Persona): string {
  return personaCopyForLocale(persona, toAppLocale(i18n.locale)).name;
}

export function localizedPersonaRoast(persona: Persona): string {
  return personaCopyForLocale(persona, toAppLocale(i18n.locale)).roast;
}

export function localizedPersonaDescription(persona: Persona): string {
  return personaCopyForLocale(persona, toAppLocale(i18n.locale)).description;
}

const POLE_L10N: Record<Pole, MessageDescriptor> = {
  DEGEN: msg`DEGEN`,
  SNIPER: msg`SNIPER`,
  GUT: msg`GUT`,
  DATA: msg`DATA`,
  PACK: msg`PACK`,
  LONE: msg`LONE`,
  DISCIPLINE: msg`DISCIPLINE`,
  RESTRAINT: msg`RESTRAINT`,
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
    src: "/assets/waitlist/question-4-v3.webp",
    alt: "The SmartX owl weighing a trusted contact's bullish call against its own data",
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
  "/assets/waitlist/waitlist-verification-v3.webp";
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
  const key = personaId.trim();
  return PERSONAS_BY_CODE[key] ?? PERSONAS_BY_CODE[key.toUpperCase()] ?? PERSONAS_BY_CODE.LQD;
}

function polesForPersona(mark: string): readonly [Pole, Pole, Pole] {
  if (mark === "RSK") return ["DISCIPLINE", "DATA", "RESTRAINT"];
  const entry = Object.entries(PERSONAS).find(([, persona]) => persona.mark === mark);
  if (entry?.[0].includes("|")) return entry[0].split("|") as [Pole, Pole, Pole];
  return ["DEGEN", "GUT", "PACK"];
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

/** 只按 personaId 取本地人格：名字、文案、三维、搭档、立绘（CDN `{id}_1.png`）。 */
export function outcomeFromPersonaId(
  personaId: string,
  stats?: Record<Stat, number>,
): Outcome {
  const persona = fallbackPersona(personaId);
  const chemistry = CHEMISTRY[persona.mark] ?? CHEMISTRY.LQD;
  const mark = persona.mark.toLowerCase();
  return {
    resultId: persona.mark,
    persona: {
      ...persona,
      artSrc: `https://static.smartx.io/waitlist/${mark}_1.png`,
    },
    poles: polesForPersona(persona.mark),
    stats: stats ?? { conviction: 72, instinct: 64, resilience: 58 },
    bestMatch: fallbackPersona(chemistry.best),
    rival: fallbackPersona(chemistry.rival),
  };
}

export function mapCardToOutcome(card: ResultCard): Outcome {
  return {
    ...outcomeFromPersonaId(card.personaId, mapStats(card.attributes)),
    resultId: card.resultId,
  };
}
