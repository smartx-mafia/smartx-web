import { msg } from "@lingui/core/macro";
import type { MessageDescriptor } from "@lingui/core";

import { i18n } from "@/lingui";

import type { QuizOption, QuizQuestion } from "./types";

const QUIZ_PROMPT_BY_ID: Record<string, MessageDescriptor> = {
  R1: msg`A coin you don't hold is up 40%. What do you do?`,
  R2: msg`Your trade is down 20% from where you bought in. What do you do?`,
  D1: msg`What actually convinces you to enter a trade?`,
  D2: msg`A trader you trust posts a high-conviction call. What do you do?`,
  S1: msg`You just made 10× on a trade. Who finds out first?`,
  S2: msg`Your group chat hates your trade. What do you do?`,
};

const QUIZ_OPTION_BY_ID: Record<string, MessageDescriptor> = {
  R1_A: msg`Jump in. I'll miss it if I don't.`,
  R1_B: msg`Buy a small amount now and see how it goes.`,
  R1_C: msg`Wait for the right price, then get in.`,
  R1_D: msg`Skip it. I didn't plan this trade.`,
  R2_A: msg`Buy more. Lower price, better average.`,
  R2_B: msg`Hold and see how it plays out.`,
  R2_C: msg`Sell a bit to reduce the risk.`,
  R2_D: msg`Cut it. This trade isn't working.`,
  D1_A: msg`I've done my research — the data and fundamentals back it up.`,
  D1_B: msg`The chart setup is clear and price action confirms it.`,
  D1_C: msg`The market feels hot and the momentum is there.`,
  D1_D: msg`Pure gut feeling. I can't explain it, but I trust it.`,
  D2_A: msg`Check it against onchain data first.`,
  D2_B: msg`Look at the chart before I touch it.`,
  D2_C: msg`Put in a small amount.`,
  D2_D: msg`Follow immediately. Good calls don't wait.`,
  S1_A: msg`Everyone. I post it everywhere.`,
  S1_B: msg`My close trading group.`,
  S1_C: msg`One friend I really trust.`,
  S1_D: msg`Nobody. I take the profit and move on.`,
  S2_A: msg`Close it. I won't trade against the group.`,
  S2_B: msg`Listen first, then decide.`,
  S2_C: msg`Debate it. I'll prove I'm right.`,
  S2_D: msg`Ignore the noise and do it alone.`,
};

const QUIZ_PROMPT_BY_TEXT: Record<string, MessageDescriptor> = Object.fromEntries(
  Object.values(QUIZ_PROMPT_BY_ID).map((descriptor) => [descriptor.message || descriptor.id || "", descriptor]),
);

const QUIZ_OPTION_BY_TEXT: Record<string, MessageDescriptor> = Object.fromEntries(
  Object.values(QUIZ_OPTION_BY_ID).map((descriptor) => [descriptor.message || descriptor.id || "", descriptor]),
);

export function localizedQuestionPrompt(question: Pick<QuizQuestion, "questionId" | "prompt">) {
  const descriptor = QUIZ_PROMPT_BY_ID[question.questionId] ?? QUIZ_PROMPT_BY_TEXT[question.prompt];
  return descriptor ? i18n._(descriptor) : question.prompt;
}

export function localizedOptionLabel(option: Pick<QuizOption, "optionId" | "label">) {
  const descriptor = QUIZ_OPTION_BY_ID[option.optionId] ?? QUIZ_OPTION_BY_TEXT[option.label];
  return descriptor ? i18n._(descriptor) : option.label;
}
