import { msg } from "@lingui/core/macro";
import type { MessageDescriptor } from "@lingui/core";

import { i18n } from "@/lingui";

import type { QuizOption, QuizQuestion } from "./types";

const QUIZ_PROMPT_BY_ID: Record<string, MessageDescriptor> = {
  R1: msg`A coin you don't own is up 40%. What's your move?`,
  R2: msg`Your position is down 20%. What happens next?`,
  D1: msg`What actually convinces you to enter a trade?`,
  D2: msg`A trader you trust posts a high-conviction call. Your move?`,
  S1: msg`You hit a 10x. Who finds out first?`,
  S2: msg`Your group chat hates your trade. Now what?`,
};

const QUIZ_OPTION_BY_ID: Record<string, MessageDescriptor> = {
  R1_A: msg`Buy now. Momentum doesn't wait.`,
  R1_B: msg`Start small, add if it holds.`,
  R1_C: msg`Set my entry and wait.`,
  R1_D: msg`Pass. No setup, no trade.`,
  R2_A: msg`Buy more. The market just improved my entry.`,
  R2_B: msg`Give it room. Decide later.`,
  R2_C: msg`Trim it. That was always the plan.`,
  R2_D: msg`Exit at invalidation. No debate.`,
  D1_A: msg`Wallet flows, hard data, a clear invalidation level.`,
  D1_B: msg`A clean chart and price confirmation.`,
  D1_C: msg`The market's mood and momentum.`,
  D1_D: msg`A thesis that just feels early.`,
  D2_A: msg`Check it against onchain data first.`,
  D2_B: msg`Look at the chart before I touch it.`,
  D2_C: msg`A small starter. I trust them.`,
  D2_D: msg`Follow immediately. Conviction is contagious.`,
  S1_A: msg`Screenshot. Group chat. Then X.`,
  S1_B: msg`My inner circle.`,
  S1_C: msg`One trusted friend, maybe.`,
  S1_D: msg`No one. I take profit and keep moving.`,
  S2_A: msg`Argue it out, and adjust if they have a point.`,
  S2_B: msg`Listen first, then decide.`,
  S2_C: msg`Hear them out, keep my plan.`,
  S2_D: msg`Ignore the noise and execute alone.`,
};

const QUIZ_PROMPT_BY_TEXT: Record<string, MessageDescriptor> = Object.fromEntries(
  Object.values(QUIZ_PROMPT_BY_ID).map((descriptor) => [descriptor.message || descriptor.id || "", descriptor]),
);

const QUIZ_OPTION_BY_TEXT: Record<string, MessageDescriptor> = Object.fromEntries(
  Object.values(QUIZ_OPTION_BY_ID).map((descriptor) => [descriptor.message || descriptor.id || "", descriptor]),
);

export function localizedQuestionPrompt(question: Pick<QuizQuestion, "questionId" | "prompt">) {
  const descriptor = QUIZ_PROMPT_BY_TEXT[question.prompt];
  return descriptor ? i18n._(descriptor) : question.prompt;
}

export function localizedOptionLabel(option: Pick<QuizOption, "optionId" | "label">) {
  const descriptor = QUIZ_OPTION_BY_TEXT[option.label];
  return descriptor ? i18n._(descriptor) : option.label;
}
