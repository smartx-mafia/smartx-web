import { msg } from "@lingui/core/macro";

import { i18nForLocale } from "@/lingui/for-locale";
import type { AppLocale } from "@/lingui";

import { personaCopyForLocale } from "./persona";
import type { Persona } from "./types";

export function shareHeadline(shareName: string, locale: AppLocale) {
  return i18nForLocale(locale)._(msg`My SmartX trader type: “${shareName}.”`);
}

export function shareCta(locale: AppLocale) {
  return i18nForLocale(locale)._(msg`Find yours in six questions.`);
}

export function shareTweetText(
  persona: Pick<Persona, "name" | "cn" | "roast" | "roastZh" | "mark" | "code">,
  locale: AppLocale,
) {
  const { name, roast } = personaCopyForLocale(persona, locale);
  const headline = shareHeadline(name, locale);
  const cta = shareCta(locale);
  return roast ? `${headline}\n\n“${roast}”\n\n${cta}` : `${headline}\n\n${cta}`;
}

export function shareOgCopy(
  persona: Pick<Persona, "name" | "cn" | "roast" | "roastZh" | "mark" | "code">,
  locale: AppLocale,
) {
  const catalog = i18nForLocale(locale);
  const { name, roast } = personaCopyForLocale(persona, locale);
  return {
    name,
    roast,
    title: shareHeadline(name, locale),
    description: roast ? `“${roast}” — ${shareCta(locale)}` : shareCta(locale),
    imageAlt: catalog._(msg`${name} — SmartX trader type card`),
    conviction: catalog._(msg`Conviction`),
    instinct: catalog._(msg`Instinct`),
    resilience: catalog._(msg`Resilience`),
    inviteCode: catalog._(msg`Invite Code`),
    backedBy: catalog._(msg`Backed by`),
    tagline: catalog._(msg`The social trading app for memes, perps, stocks and prediction markets.`),
  };
}
