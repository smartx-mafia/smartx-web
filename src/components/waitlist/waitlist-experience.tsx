"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLingui } from "@lingui/react";
import { msg, t } from "@lingui/core/macro";
import { Plural, Trans } from "@lingui/react/macro";
import type { MessageDescriptor } from "@lingui/core";

import { ConsumerHeader } from "@/components/consumer-network/consumer-header";
import { notifyError } from "@/components/site/app-notice";
import { isInviteAccepted, inviteCheckMessage, isValidEmail, isValidInviteCode, normalizeEmail, normalizeInviteCode, resolvePrototypeResult, waitlistApi } from "@/lib/waitlist/api";
import {
  hydrateQuestions,
  localizedPersonaDescription,
  localizedPersonaName,
  localizedPersonaRoast,
  mapCardToOutcome,
  PERSONAS_BY_CODE,
  prefetchQuizArtwork,
  QUIZ_ART_SRCS,
  WAITLIST_VERIFICATION_ART_SRC,
} from "@/lib/waitlist/persona";
import { localizedOptionLabel, localizedQuestionPrompt } from "@/lib/waitlist/quiz-i18n";
import {
  createImagePreviewUrl,
  isAndroid,
  isIOS,
  type ShareImageAction,
  type ShareImageActionResult,
} from "@/lib/waitlist/share-image";
import { i18n, toAppLocale } from "@/lingui";
import { shareTweetText } from "@/lib/waitlist/share-copy";
import { encodeShareResult, WAITLIST_SHARE_CARD_VERSION } from "@/lib/waitlist/share-result";
import {
  decideWaitlistEntry,
  isOwnResultAvailable,
  rememberWaitlistNotice,
  shareQueryPresent,
  takeWaitlistNotice,
  waitlistPathWithoutShare,
} from "@/lib/waitlist/routing";
import {
  clearLandingInvite,
  clearQuizDraft,
  clearUserToken,
  getLandingInvite,
  getQuizDraft,
  getUserToken,
  setLandingInvite,
  setQuizDraft,
  setUserToken,
} from "@/lib/waitlist/session";
import {
  type AuthIntent,
  type CommunityChannel,
  type Outcome,
  type QuizQuestion,
  type ResultCard,
  type UserInfo,
  type WaitlistStage,
  isMissingUserError,
  isUnlockedResult,
  isWaitlistApiError,
} from "@/lib/waitlist/types";

import { WaitlistActionScope, WaitlistButton } from "./waitlist-button";
import { ShareVerificationDialog } from "./share-verification-dialog";
import { RankingInfo } from "./ranking-info";
import { readShareVerification, verifiedInviteCount, verifiedRank, type ShareVerification } from "@/lib/waitlist/share-verification";
import { ResultDialog } from "./result-dialog";
import { DownloadDialog } from "./download-dialog";
import { ResultToast, useResultToast } from "./result-toast";
import styles from "./waitlist.module.css";

const WAITLIST_URL = "https://smartx.io/waitlist/";
const NO_SAVED_RESULT = "No saved result is linked to this email. Take the test to create one.";
const INVALID_EMAIL = "Please enter a valid email address.";
const GENERIC_ERROR = "Something went wrong. Please try again.";
const INVITE_UNRECOGNIZED = "Invite code not recognized. Check the code and try again.";
const SESSION_EXPIRED = "Authorization error";
const INVALID_ANSWERS = "invalid answers";
const INVITES_POLL_MS = 10_000;
const OTP_RESEND_SECONDS = 60;
const DEFAULT_COMMUNITY = {
  telegram: "https://t.me/SmartX_Community",
  x: "https://x.com/SmartXTerminal",
};

function resolveCommunityHref(value: string | undefined, fallback: string) {
  const href = value?.trim() ?? "";
  if (!href) return fallback;
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    return href;
  } catch {
    return fallback;
  }
}

function communityLinksFrom(info: { links?: { telegram?: string; x?: string } } | null | undefined) {
  return {
    telegram: resolveCommunityHref(info?.links?.telegram, DEFAULT_COMMUNITY.telegram),
    x: resolveCommunityHref(info?.links?.x, DEFAULT_COMMUNITY.x),
  };
}

// 状态与分支逻辑始终使用英文规范文案（与 API 返回值精确比较）；
// 只在渲染时经此映射表转成当前语言，未知文案原样透出。
const WAITLIST_MESSAGE_L10N: Record<string, MessageDescriptor> = {
  [NO_SAVED_RESULT]: msg`No saved result is linked to this email. Take the test to create one.`,
  [INVALID_EMAIL]: msg`Please enter a valid email address.`,
  [GENERIC_ERROR]: msg`Something went wrong. Please try again.`,
  [INVITE_UNRECOGNIZED]: msg`Invite code not recognized. Check the code and try again.`,
  [SESSION_EXPIRED]: msg`Your session expired. Sign in again to continue.`,
  [INVALID_ANSWERS]: msg`Those answers didn’t go through. Check all six questions and try again.`,
  "Verification code is incorrect or expired": msg`Verification code is incorrect or expired`,
  "Please wait before requesting a new code.": msg`Please wait before requesting a new code.`,
  "Email send limit exceeded. Try again later.": msg`Email send limit exceeded. Try again later.`,
  "Failed to send verification code": msg`Failed to send verification code`,
  "Too many requests. Try again later.": msg`Too many requests. Try again later.`,
  "service is busy": msg`Service is busy. Try again in a moment.`,
  "request too many times": msg`Too many requests. Try again later.`,
  "result not found": msg`That result could not be found.`,
  "user not found": msg`No account was found for this email.`,
  "Quiz not submitted yet": msg`Finish the test before unlocking your result.`,
  "parameters missing": msg`Required information is missing. Try again.`,
  "invalid channel": msg`That community step could not be recorded. Try again.`,
  "authorization required": msg`Your session expired. Sign in again to continue.`,
};

function localizeWaitlistMessage(message: string) {
  if (!message) return message;
  const descriptor = WAITLIST_MESSAGE_L10N[message];
  return descriptor ? i18n._(descriptor) : message;
}

type Workspace =
  | {
      kind: "result";
      outcome: Outcome;
      rank: number | null;
      verification: ShareVerification;
      verifiedFriends: number | null;
      inviteCode: string;
      links: { telegram: string; x: string };
      info: UserInfo;
    }
  | {
      kind: "result-pending";
      links: { telegram: string; x: string };
      info: UserInfo;
    };

function buildQuizAnswers(questions: QuizQuestion[], answers: Record<string, string>) {
  return Object.fromEntries(
    questions
      .map((question) => [question.questionId, answers[question.questionId]] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
}

function remainingSeconds(until: number, now: number) {
  return Math.max(0, Math.ceil((until - now) / 1000));
}

function formatClock(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function personaTitleFit(name: string) {
  const units = Array.from(name.trim()).reduce((total, character) => {
    if (/\s/u.test(character)) return total + 0.35;
    return total + (/[^\u0000-\u00ff]/u.test(character) ? 1 : 0.49);
  }, 0);
  return `${Math.min(16, 100 / Math.max(units, 1)).toFixed(3)}cqw`;
}

function formatWaitlistCopy(message: string) {
  if (message === "ERROR") return GENERIC_ERROR;
  return message;
}

function errorMessage(error: unknown) {
  if (isWaitlistApiError(error)) return formatWaitlistCopy(error.message) || GENERIC_ERROR;
  return GENERIC_ERROR;
}

function isUnauthorized(error: unknown) {
  return isWaitlistApiError(error) && error.code === 401;
}

function isExpiredSession(error: unknown) {
  return isUnauthorized(error) || isMissingUserError(error);
}

function makeInvitationUrl(
  code?: string,
  useCurrentOrigin = false,
  extras?: { locale?: string; result?: string | null },
) {
  const base = useCurrentOrigin && typeof window !== "undefined" ? new URL("/waitlist/", window.location.origin).toString() : WAITLIST_URL;
  const url = new URL(base);
  if (code) url.searchParams.set("invite", normalizeInviteCode(code));
  if (extras?.locale) url.searchParams.set("lang", toAppLocale(extras.locale));
  if (extras?.result) {
    url.searchParams.set("result", extras.result);
    url.searchParams.set("v", WAITLIST_SHARE_CARD_VERSION);
  }
  return url.toString();
}

function publicShareCard(data: { hidden?: boolean; card?: ResultCard | null } | null) {
  if (!data || data.hidden || !data.card) return null;
  return data.card;
}

async function fetchWorkspace(token: string): Promise<Workspace> {
  const [initialResult, community, info] = await Promise.all([
    waitlistApi.getMyResult(token),
    waitlistApi.getCommunityInfo(token).catch(() => null),
    waitlistApi.getUserInfo(token),
  ]);
  const result = await resolvePrototypeResult(token, initialResult);
  const links = communityLinksFrom(community);
  if (isUnlockedResult(result)) {
    const verification = readShareVerification(result.shareVerification);
    return {
      kind: "result" as const,
      outcome: mapCardToOutcome(result),
      rank: verifiedRank(verification, result.rank),
      verification,
      verifiedFriends: verifiedInviteCount(result.verifiedInviteCount),
      inviteCode: info.inviteCode || "",
      links,
      info,
    };
  }
  // Outside the explicitly enabled local prototype bridge, old servers may still withhold the card.
  return { kind: "result-pending", links, info };
}

function QuestionArtwork({
  question,
  questions,
}: {
  question: QuizQuestion;
  questions: QuizQuestion[];
}) {
  const layers = questions.length ? questions : [question];

  return (
    <div className={styles.questionArtwork}>
      {layers.map((item) => {
        const active = item.questionId === question.questionId;
        return (
          <div
            key={item.questionId}
            className={styles.questionArtLayer}
            data-active={active ? "true" : undefined}
            >
              <Image
                src={item.artSrc}
                alt=""
                fill
                sizes="(max-width: 750px) 100vw, 50vw"
                priority
                loading="eager"
                aria-hidden="true"
              />
          </div>
        );
      })}
    </div>
  );
}

function ScoreAxis({ label, score }: { label: string; score: number }) {
  return (
    <div className={styles.scoreAxis}>
      <div><span>{label}</span><strong>{score}</strong></div>
      <div className={styles.scoreTrack}><i style={{ width: `${score}%` }} /></div>
    </div>
  );
}

function AccountSession({
  email,
  label,
  compact,
  place,
  xUsername,
  resultIdentity = false,
  onSignOut,
}: {
  email: string;
  label: string;
  compact?: boolean;
  place?: "copy" | "scene";
  xUsername?: string;
  resultIdentity?: boolean;
  onSignOut: () => void;
}) {
  useLingui();

  const [accountOpen, setAccountOpen] = useState(false);

  if (resultIdentity) {
    return (
      <div className={styles.resultIdentity}>
        <button type="button" className={styles.resultIdentityCopy} aria-label={t`Account details`} aria-haspopup="dialog" onClick={() => setAccountOpen(true)}>
          <div className={styles.resultIdentityPrimary}>
            <Image src={xUsername ? "/assets/waitlist/x.svg" : "/assets/waitlist/result/mail.svg"} alt="" width={28} height={28} />
            <strong>{xUsername ? `@${xUsername}` : email || t`Email verified`}</strong>
            <Image className={styles.accountChevron} src="/assets/waitlist/result/chevron.svg" alt="" width={16} height={16} />
          </div>
          {xUsername && email ? <p className={styles.resultIdentityEmail}>{email}</p> : null}
        </button>
        <WaitlistButton className={styles.resultSignOut} type="button" onClick={onSignOut} aria-label={t`Sign out`} title={t`Sign out`}>
          <Image src="/assets/waitlist/result/log-out.svg" alt="" width={20} height={20} />
        </WaitlistButton>
        <ResultDialog open={accountOpen} onClose={() => setAccountOpen(false)} title={t`Account details`}>
          <div className={styles.accountDetails}>
            {xUsername ? <div><Image src="/assets/waitlist/x.svg" alt="" width={20} height={20} /><strong>@{xUsername}</strong></div> : null}
            <div><Image src="/assets/waitlist/result/mail.svg" alt="" width={20} height={20} /><span>{email || t`Email verified`}</span></div>
            <button type="button" onClick={() => { setAccountOpen(false); onSignOut(); }}><Image src="/assets/waitlist/result/log-out.svg" alt="" width={20} height={20} /><Trans>Sign out</Trans></button>
          </div>
        </ResultDialog>
      </div>
    );
  }

  return (
    <div className={styles.accountStrip} data-compact={compact ? "true" : undefined} data-place={place}>
      <div>
        <span>{label}</span>
        <strong>{email || t`Email verified`}</strong>
        {xUsername ? <p className={styles.boundAccount}>{t`Connected on X: @${xUsername}`}</p> : null}
      </div>
      <WaitlistButton type="button" onClick={onSignOut}>
        <Trans>Sign out</Trans>
      </WaitlistButton>
    </div>
  );
}

function PersonaArtwork({ outcome }: { outcome: Outcome }) {
  const artSrc = outcome.persona.artSrc;
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">(
    artSrc ? "loading" : "error",
  );

  return (
    <div className={styles.personaArt} data-image-state={imageState}>
      {imageState !== "ready" ? (
        <div className={styles.personaArtPlaceholder} aria-hidden="true">
          <Image src="/assets/consumer-network/logo-white.svg" alt="" width={34} height={28} />
          <span>SmartX</span>
        </div>
      ) : null}
      {artSrc && imageState !== "error" ? (
        <Image
          src={artSrc}
          alt={outcome.persona.artAlt}
          fill
          sizes="(max-width: 750px) calc(100vw - 40px), (max-width: 1200px) 46vw, 700px"
          priority
          onLoad={() => setImageState("ready")}
          onError={() => setImageState("error")}
        />
      ) : null}
    </div>
  );
}

function PersonaPoster({
  outcome,
}: {
  outcome: Outcome;
}) {
  useLingui();
  const personaName = localizedPersonaName(outcome.persona);
  const personaDescription = localizedPersonaDescription(outcome.persona);
  const [expanded, setExpanded] = useState(false);
  const titleStyle = { "--persona-title-fit": personaTitleFit(personaName) } as CSSProperties;

  return (
    <article className={styles.personaPoster}>
      <div className={styles.posterIdentity}>
        <h2 style={titleStyle}>{personaName}</h2>
      </div>
      <PersonaArtwork key={outcome.persona.artSrc} outcome={outcome} />
      <div className={styles.posterScores}>
        <ScoreAxis label={t`Conviction`} score={outcome.stats.conviction} />
        <ScoreAxis label={t`Instinct`} score={outcome.stats.instinct} />
        <ScoreAxis label={t`Resilience`} score={outcome.stats.resilience} />
      </div>
      {outcome.persona.roast || personaDescription ? (
        <div className={styles.personaNarrative} data-expanded={expanded}>
          {outcome.persona.roast ? <blockquote>{localizedPersonaRoast(outcome.persona)}</blockquote> : null}
          {personaDescription ? <p className={styles.personaDescription}>{personaDescription}</p> : null}
          {personaDescription ? <button type="button" className={styles.narrativeToggle} aria-expanded={expanded} aria-label={expanded ? t`Collapse personality` : t`Expand personality`} onClick={() => setExpanded((value) => !value)}><Image src="/assets/waitlist/result/chevron.svg" alt="" width={16} height={16} /></button> : null}
        </div>
      ) : null}
      <section className={styles.chemistryBlock} aria-label={t`Persona chemistry`}>
        <div><span><Trans>Best match</Trans></span><strong>{localizedPersonaName(outcome.bestMatch)}</strong></div>
        <div><span><Trans>Natural rival</Trans></span><strong>{localizedPersonaName(outcome.rival)}</strong></div>
      </section>
    </article>
  );
}

export function WaitlistExperience() {
  const { i18n: lingui } = useLingui(); // 订阅语言切换，保证组件内 t 宏文案随 locale 重渲染
  const locale = toAppLocale(lingui.locale);
  const router = useRouter();
  const pathname = usePathname();
  const shareParams = useSearchParams();
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const [stage, setStage] = useState<WaitlistStage>("boot");
  const [inviteCode, setInviteCode] = useState("");
  const [gateError, setGateError] = useState("");
  const [referralOutcome, setReferralOutcome] = useState<Outcome | null>(null);
  const [ownOutcome, setOwnOutcome] = useState<Outcome | null>(null);
  const [userToken, setUserTokenState] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [authIntent, setAuthIntent] = useState<AuthIntent>("create");
  const [email, setEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpResendAt, setOtpResendAt] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const otpSubmitInFlightRef = useRef(false);
  const lastSubmittedOtpRef = useRef("");
  const [recoveryError, setRecoveryError] = useState("");
  const [communityLinks, setCommunityLinks] = useState(DEFAULT_COMMUNITY);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const inviteCodeRef = useRef(inviteCode);
  inviteCodeRef.current = inviteCode;
  const validatedLandingInviteRef = useRef("");
  const [quizWarning, setQuizWarning] = useState("");
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [verification, setVerification] = useState<ShareVerification>({ status: "unverified" });
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verifiedFriends, setVerifiedFriends] = useState<number | null>(null);
  const [ownInviteCode, setOwnInviteCode] = useState("");
  const [rank, setRank] = useState<number | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const { toast, showToast, dismissToast } = useResultToast();
  const verificationRef = useRef(verification);
  verificationRef.current = verification;
  const [sharePreview, setSharePreview] = useState<{ url: string; tip: string } | null>(null);
  const activeTokenRef = useRef(userToken);
  activeTokenRef.current = userToken;
  const verificationRevisionRef = useRef(0);

  useEffect(() => {
    prefetchQuizArtwork();
  }, []);

  const loggedIn = Boolean(userToken && userInfo);
  const hasOwnResult = isOwnResultAvailable({ loggedIn, submitted: Boolean(userInfo?.submitted && userInfo.resultId) });
  const savedPersona = ownOutcome?.persona ?? PERSONAS_BY_CODE[userInfo?.personaId ?? ""];
  const savedPersonaName = savedPersona ? localizedPersonaName(savedPersona) : t`your trader type`;
  const sharePersonaId = userInfo?.personaId || ownOutcome?.persona.mark;
  const shareResultCode = ownOutcome
    ? encodeShareResult(sharePersonaId, ownOutcome.stats)
    : null;
  const ownInvitationUrl = ownInviteCode
    ? makeInvitationUrl(ownInviteCode, true)
    : "";
  const currentQuestion = questions[questionIndex];
  const verifiedEmail = userInfo?.email || sessionEmail || email;
  const shareCompleted = verification.status === "verified";
  const clock = nowMs || (otpResendAt ? Date.now() : 0);
  const otpCooldown = otpResendAt ? remainingSeconds(otpResendAt, clock) : 0;

  const clearShareUrl = (options?: { hard?: boolean; notice?: string }) => {
    if (typeof window === "undefined") return;
    const dirty = shareQueryPresent() || Boolean(shareParams.get("result") || shareParams.get("invite"));
    const next = waitlistPathWithoutShare();
    if (!dirty) {
      if (options?.notice) setGateError(options.notice);
      return;
    }
    if (options?.hard) {
      if (options.notice) rememberWaitlistNotice(options.notice);
      window.location.replace(next);
      return;
    }
    window.history.replaceState(window.history.state, "", next);
    routerRef.current.replace(next || pathnameRef.current, { scroll: false });
  };

  const applyWorkspace = (workspace: Workspace) => {
    setCommunityLinks(workspace.links);
    setUserInfo(workspace.info);
    if (workspace.kind === "result") {
      setOwnOutcome(workspace.outcome);
      setRank(workspace.rank);
      setVerification(workspace.verification);
      setVerifiedFriends(workspace.verifiedFriends);
      setOwnInviteCode(workspace.inviteCode);
      setStage("result");
      return;
    }
    setVerifiedFriends(null);
    setOwnInviteCode("");
    setStage("result-pending");
  };

  const persistLandingInvite = (code: string) => {
    const next = normalizeInviteCode(code);
    if (!isValidInviteCode(next)) return false;
    setLandingInvite(next);
    setInviteCode(next);
    return true;
  };

  const dropLandingInvite = () => {
    validatedLandingInviteRef.current = "";
    clearLandingInvite();
  };

  const resetAuth = (options?: { keepDraft?: boolean }) => {
    setDownloadOpen(false);
    dismissToast();
    activeTokenRef.current = "";
    verificationRevisionRef.current += 1;
    clearUserToken();
    setUserTokenState("");
    setUserInfo(null);
    setOwnOutcome(null);
    setOwnInviteCode("");
    setRank(null);
    setVerification({ status: "unverified" });
    setVerificationOpen(false);
    setVerifiedFriends(null);
    setSessionEmail("");
    setEmail("");
    setOtp("");
    setOtpError("");
    setOtpSubmitting(false);
    otpSubmitInFlightRef.current = false;
    lastSubmittedOtpRef.current = "";
    if (!options?.keepDraft) {
      clearQuizDraft();
      setAnswers({});
      setQuestionIndex(0);
    }
  };

  const handleExpiredUserSession = (error: unknown) => {
    const hadResult = Boolean(userInfo?.submitted && userInfo.resultId);
    const draft = getQuizDraft();
    const hasDraft = Boolean(draft && Object.keys(draft.answers).length);
    resetAuth({ keepDraft: true });
    setOtp("");
    setOtpError("");
    const message = errorMessage(error);
    if (hadResult) {
      setAuthIntent("recover");
      setRecoveryError(message === SESSION_EXPIRED ? message : SESSION_EXPIRED);
      setStage("email");
      return;
    }
    if (hasDraft) {
      setAuthIntent("create");
      setRecoveryError(message === SESSION_EXPIRED ? message : SESSION_EXPIRED);
      setStage("email");
      return;
    }
    setGateError(message === "user not found" ? message : SESSION_EXPIRED);
    setStage("gate");
  };

  const handleUserApiError = (error: unknown) => {
    if (!isExpiredSession(error)) return false;
    handleExpiredUserSession(error);
    return true;
  };
  const handleUserApiErrorRef = useRef(handleUserApiError);
  handleUserApiErrorRef.current = handleUserApiError;

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const pendingNotice = takeWaitlistNotice();
      if (pendingNotice) setGateError(pendingNotice);

      const params = new URLSearchParams(window.location.search);
      const urlInviteRaw = (params.get("invite") ?? "").trim();
      const urlInvite = normalizeInviteCode(urlInviteRaw);
      const shareEntry = Boolean(urlInviteRaw);
      const storedUserToken = getUserToken();
      const quizDraft = getQuizDraft();
      const storedInvite = getLandingInvite();

      let invite = urlInvite || storedInvite;
      if (urlInvite) {
        persistLandingInvite(urlInvite);
        invite = urlInvite;
      } else if (storedInvite) {
        invite = storedInvite;
      }

      if (invite) setInviteCode(invite);
      if (quizDraft) {
        setAnswers(quizDraft.answers);
        setQuestionIndex(quizDraft.questionIndex);
      }

      const [questionsResult, infoResult, publicResult, inviteCardResult, inviteStatusResult] = await Promise.allSettled([
        waitlistApi.getQuestions().then((data) => hydrateQuestions(data.questions)),
        storedUserToken ? waitlistApi.getUserInfo(storedUserToken) : Promise.resolve(null),
        shareEntry && isValidInviteCode(urlInvite) ? waitlistApi.getPublicResult(urlInvite) : Promise.resolve(null),
        shareEntry && isValidInviteCode(urlInvite) ? waitlistApi.getInviterCard(urlInvite) : Promise.resolve(null),
        isValidInviteCode(invite) ? waitlistApi.checkInvite(invite) : Promise.resolve(null),
      ]);

      if (cancelled) return;

      if (questionsResult.status === "fulfilled") {
        setQuestions(questionsResult.value);
        prefetchQuizArtwork(questionsResult.value.map((item) => item.artSrc));
      }

      let info: UserInfo | null = null;
      if (infoResult.status === "fulfilled") {
        info = infoResult.value;
      } else if (storedUserToken) {
        if (isExpiredSession(infoResult.reason)) {
          clearUserToken();
        } else {
          setGateError(errorMessage(infoResult.reason));
          setStage("gate");
          return;
        }
      }

      if (info && storedUserToken) {
        setUserTokenState(storedUserToken);
        setUserInfo(info);
        setSessionEmail(info.email);
        if (info.inviteCode) setOwnInviteCode(info.inviteCode);
      }

      const friendCard =
        (publicResult.status === "fulfilled" ? publicShareCard(publicResult.value) : null) ??
        (inviteCardResult.status === "fulfilled" ? inviteCardResult.value : null);
      if (friendCard) setReferralOutcome(mapCardToOutcome(friendCard));

      const inviteView = inviteStatusResult.status === "fulfilled" ? inviteStatusResult.value : null;
      const inviteRejected = inviteStatusResult.status === "rejected";
      const inviteBlocked = Boolean(invite) && (inviteRejected || !isInviteAccepted(inviteView));
      if (inviteRejected) {
        dropLandingInvite();
        setGateError(errorMessage(inviteStatusResult.reason));
      } else if (inviteBlocked) {
        dropLandingInvite();
        setGateError(inviteCheckMessage(inviteView, INVITE_UNRECOGNIZED));
      } else if (isInviteAccepted(inviteView) && invite) {
        validatedLandingInviteRef.current = normalizeInviteCode(invite);
        persistLandingInvite(invite);
      }

      const route = decideWaitlistEntry({
        hasFriendCard: Boolean(friendCard),
        loggedIn: Boolean(info && storedUserToken),
        submitted: Boolean(info?.submitted && info.resultId),
        hasQuizProgress: Boolean(quizDraft && Object.keys(quizDraft.answers).length),
      });

      if (route.stage === "result" && storedUserToken) {
        try {
          applyWorkspace(await fetchWorkspace(storedUserToken));
        } catch (error) {
          if (!handleUserApiError(error)) {
            setGateError(errorMessage(error));
            setStage("gate");
          }
        }
        return;
      }

      if (route.stage === "quiz" && questionsResult.status !== "fulfilled") {
        setGateError(errorMessage(questionsResult.reason));
        setStage("gate");
        return;
      }

      if (inviteBlocked && route.stage === "quiz") {
        setStage("gate");
        return;
      }

      if (route.stage === "quiz") clearShareUrl();
      setStage(route.stage);
    }

    bootstrap().catch(() => {
      if (!cancelled) {
        setGateError(GENERIC_ERROR);
        setStage("gate");
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, []);

  useEffect(() => {
    if (stage !== "verify") return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "quiz" && stage !== "email" && stage !== "verify") return;
    setQuizDraft({ answers, questionIndex });
  }, [answers, questionIndex, stage]);

  useEffect(() => {
    if (stage !== "result" || !userToken) return;
    let inFlight = false;
    let cancelled = false;
    const pollInvites = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      const revision = verificationRevisionRef.current;
      try {
        const [info, result] = await Promise.all([
          waitlistApi.getUserInfo(userToken),
          waitlistApi.getMyResult(userToken),
        ]);
        if (cancelled || activeTokenRef.current !== userToken || revision !== verificationRevisionRef.current) return;
        setUserInfo(info);
        if (info.inviteCode) setOwnInviteCode(info.inviteCode);
        if (isUnlockedResult(result)) {
          const nextVerification = readShareVerification(result.shareVerification);
          if (nextVerification.status === "verified" && verificationRef.current.status !== "verified") {
            setVerificationOpen(false);
            showToast(t`X connected. Your rank is unlocked.`);
          }
          setRank(verifiedRank(nextVerification, result.rank));
          setVerification(nextVerification);
          setVerifiedFriends(verifiedInviteCount(result.verifiedInviteCount));
        }
      } catch (error) {
        if (!cancelled && activeTokenRef.current === userToken) handleUserApiErrorRef.current(error);
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(() => {
      void pollInvites();
    }, INVITES_POLL_MS);
    const onVisible = () => { if (!document.hidden) void pollInvites(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [stage, userToken, showToast]);

  const ensureQuestions = async () => {
    if (questions.length) return questions;
    const data = await waitlistApi.getQuestions();
    const next = hydrateQuestions(data.questions);
    prefetchQuizArtwork(next.map((item) => item.artSrc));
    setQuestions(next);
    return next;
  };

  const verifyLandingInvite = async (code: string) => {
    const next = normalizeInviteCode(code);
    if (!isValidInviteCode(next)) {
      dropLandingInvite();
      setGateError(INVITE_UNRECOGNIZED);
      return false;
    }
    if (validatedLandingInviteRef.current === next) {
      setGateError("");
      return true;
    }
    try {
      const view = await waitlistApi.checkInvite(next);
      if (isInviteAccepted(view)) {
        validatedLandingInviteRef.current = next;
        persistLandingInvite(next);
        setGateError("");
        return true;
      }
      dropLandingInvite();
      setGateError(inviteCheckMessage(view, INVITE_UNRECOGNIZED));
      return false;
    } catch (error) {
      dropLandingInvite();
      setGateError(errorMessage(error));
      return false;
    }
  };

  const enterQuiz = async () => {
    setQuizWarning("");
    await ensureQuestions();
    setAuthIntent("create");
    const draft = getQuizDraft();
    if (!draft || !Object.keys(draft.answers).length) {
      setQuestionIndex(0);
      setAnswers({});
    } else {
      setAnswers(draft.answers);
      setQuestionIndex(draft.questionIndex);
    }
    clearShareUrl();
    setStage("quiz");
  };

  const startQuiz = async () => {
    try {
      const allowed = await verifyLandingInvite(inviteCodeRef.current);
      if (!allowed) return;
      setGateError("");
      await enterQuiz();
    } catch (error) {
      setGateError(errorMessage(error));
    }
  };

  const beginFromReferral = () => startQuiz();

  const beginWithoutInvite = async () => {
    setGateError("");
    try {
      await enterQuiz();
    } catch (error) {
      setGateError(errorMessage(error));
    }
  };

  const beginResultRecovery = () => {
    setAuthIntent("recover");
    setEmail("");
    setOtp("");
    setOtpError("");
    setOtpSubmitting(false);
    otpSubmitInFlightRef.current = false;
    lastSubmittedOtpRef.current = "";
    setRecoveryError("");
    setStage("email");
  };

  const viewSavedResult = async () => {
    if (!userToken) return;
    try {
      applyWorkspace(await fetchWorkspace(userToken));
    } catch (error) {
      if (!handleUserApiError(error)) notifyError(localizeWaitlistMessage(errorMessage(error)));
    }
  };

  const signOutWaitlist = () => {
    resetAuth();
    setInviteCode("");
    setReferralOutcome(null);
    setGateError("");
    setStage("gate");
  };

  const submitEmail = async () => {
    setRecoveryError("");
    setOtpError("");
    const nextEmail = normalizeEmail(email);
    if (!isValidEmail(nextEmail)) {
      setRecoveryError(INVALID_EMAIL);
      return;
    }
    setEmail(nextEmail);
    try {
      if (authIntent === "create") {
        const check = await waitlistApi.checkEmailRegistered(nextEmail);
        if (check?.registered === true) {
          clearQuizDraft();
          answersRef.current = {};
          setAnswers({});
          setQuestionIndex(0);
          setOtp("");
          setOtpError("");
          setRecoveryError("");
          setAuthIntent("recover");
        }
      }
      await waitlistApi.sendEmailCode(nextEmail, locale);
      setOtp("");
      setOtpSubmitting(false);
      otpSubmitInFlightRef.current = false;
      lastSubmittedOtpRef.current = "";
      const now = Date.now();
      setNowMs(now);
      setOtpResendAt(now + OTP_RESEND_SECONDS * 1000);
      setStage("verify");
    } catch (error) {
      setRecoveryError(errorMessage(error));
    }
  };

  const resendCode = async () => {
    if (otpCooldown > 0) return;
    try {
      await waitlistApi.sendEmailCode(email, locale);
      setOtp("");
      setOtpError("");
      setOtpSubmitting(false);
      otpSubmitInFlightRef.current = false;
      lastSubmittedOtpRef.current = "";
      const now = Date.now();
      setNowMs(now);
      setOtpResendAt(now + OTP_RESEND_SECONDS * 1000);
    } catch (error) {
      setOtpError(errorMessage(error));
    }
  };

  const enterAfterLogin = async (token: string, isNewUser: boolean, resultId: string) => {
    setUserToken(token);
    setUserTokenState(token);

    if (isNewUser) {
      const activeQuestions = await ensureQuestions();
      const localAnswers = buildQuizAnswers(activeQuestions, answersRef.current);
      const hasCompleteAnswers =
        activeQuestions.length > 0 && Object.keys(localAnswers).length === activeQuestions.length;

      if (!hasCompleteAnswers) {
        setQuizWarning("");
        setStage("quiz");
        return;
      }

      try {
        await waitlistApi.submitQuiz(localAnswers, token);
      } catch (error) {
        if (handleUserApiError(error)) return;
        setQuizWarning(errorMessage(error));
        setStage("quiz");
        return;
      }
      clearQuizDraft();
      const info = await waitlistApi.getUserInfo(token);
      setUserInfo(info);
      setSessionEmail(info.email);
      applyWorkspace(await fetchWorkspace(token));
      return;
    }

    const info = await waitlistApi.getUserInfo(token);
    setUserInfo(info);
    setSessionEmail(info.email);
    if (resultId || info.submitted) {
      clearQuizDraft();
      applyWorkspace(await fetchWorkspace(token));
      return;
    }

    const localAnswers = buildQuizAnswers(questions, answersRef.current);
    if (questions.length && Object.keys(localAnswers).length === questions.length) {
      try {
        await waitlistApi.submitQuiz(localAnswers, token);
        clearQuizDraft();
        applyWorkspace(await fetchWorkspace(token));
        return;
      } catch (error) {
        if (handleUserApiError(error)) return;
        setQuizWarning(errorMessage(error));
      }
    }

    await ensureQuestions();
    setStage("quiz");
  };

  const resolveLoginInvite = () => {
    const typed = normalizeInviteCode(inviteCodeRef.current);
    if (isValidInviteCode(typed)) return typed;
    const stored = getLandingInvite();
    return isValidInviteCode(stored) ? stored : "";
  };

  const submitOtp = async (code: string) => {
    if (code.length !== 6 || otpSubmitInFlightRef.current) return;
    otpSubmitInFlightRef.current = true;
    setOtpSubmitting(true);
    setOtpError("");
    const loginInvite = resolveLoginInvite();
    try {
      const login = await waitlistApi.login(email, code, loginInvite || undefined);
      await enterAfterLogin(login.token, login.isNewUser, login.resultId);
    } catch (error) {
      if (handleUserApiError(error)) return;
      if (isWaitlistApiError(error) && error.message === INVITE_UNRECOGNIZED && loginInvite) {
        try {
          dropLandingInvite();
          setInviteCode("");
          const login = await waitlistApi.login(email, code);
          await enterAfterLogin(login.token, login.isNewUser, login.resultId);
          return;
        } catch (retryError) {
          if (handleUserApiError(retryError)) return;
          setOtpError(errorMessage(retryError));
          window.requestAnimationFrame(() => otpInputRef.current?.focus());
          return;
        }
      }
      setOtpError(errorMessage(error));
      window.requestAnimationFrame(() => otpInputRef.current?.focus());
    } finally {
      otpSubmitInFlightRef.current = false;
      setOtpSubmitting(false);
    }
  };

  const updateOtpValue = (value: string) => {
    const next = value.replace(/\D/g, "").slice(0, 6);
    setOtp(next);
    setOtpError("");
    if (next.length < 6) lastSubmittedOtpRef.current = "";
    if (next.length === 6 && lastSubmittedOtpRef.current !== next) {
      lastSubmittedOtpRef.current = next;
      void submitOtp(next);
    }
  };

  const clearOtpEntry = () => {
    lastSubmittedOtpRef.current = "";
    setOtp("");
    setOtpError("");
    window.requestAnimationFrame(() => otpInputRef.current?.focus());
  };

  const changeEmail = () => {
    clearOtpEntry();
    setStage("email");
  };

  const finishQuiz = async () => {
    if (userToken) {
      try {
        await waitlistApi.submitQuiz(buildQuizAnswers(questions, answersRef.current), userToken);
        clearQuizDraft();
        const info = await waitlistApi.getUserInfo(userToken);
        setUserInfo(info);
        applyWorkspace(await fetchWorkspace(userToken));
      } catch (error) {
        if (!handleUserApiError(error)) setQuizWarning(errorMessage(error));
      }
      return;
    }
    setAuthIntent("create");
    setStage("email");
  };

  const answerQuestion = async (optionId: string) => {
    if (!currentQuestion) return;
    setQuizWarning("");
    const nextAnswers = { ...answers, [currentQuestion.questionId]: optionId };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    if (questionIndex === questions.length - 1) {
      await finishQuiz();
      return;
    }
    setQuestionIndex((current) => current + 1);
  };

  const goBack = () => {
    if (questionIndex === 0) {
      setStage("gate");
      return;
    }
    setQuestionIndex((current) => current - 1);
  };

  const openCommunity = (channel: CommunityChannel) => {
    const fallback = channel === "telegram" ? DEFAULT_COMMUNITY.telegram : DEFAULT_COMMUNITY.x;
    const href = resolveCommunityHref(
      channel === "telegram" ? communityLinks.telegram : communityLinks.x,
      fallback,
    );
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const revealResult = async () => {
    if (!userToken) return;
    try {
      applyWorkspace(await fetchWorkspace(userToken));
    } catch (error) {
      if (!handleUserApiError(error)) notifyError(localizeWaitlistMessage(errorMessage(error)));
    }
  };

  const shareResult = () => {
    if (!ownOutcome || !ownInviteCode) return;
    if (!shareCompleted) setVerificationOpen(true);
    if (verification.status === "pending") return;
    const shareUrl = new URL("https://twitter.com/intent/tweet");
    shareUrl.searchParams.set("text", shareTweetText(ownOutcome.persona, locale));
    shareUrl.searchParams.set("url", makeInvitationUrl(ownInviteCode, true, { locale, result: shareResultCode }));
    window.open(shareUrl.toString(), "_blank", "noopener,noreferrer");
  };

  const verifySharedPost = async (postUrl: string) => {
    const token = userToken;
    if (!token) return;
    verificationRevisionRef.current += 1;
    try {
      const next = await waitlistApi.verifyShare(postUrl, token);
      if (activeTokenRef.current !== token) return;
      verificationRevisionRef.current += 1;
      setVerification(next);
      setRank(null);
      if (next.status === "verified") {
        setVerificationOpen(false);
        showToast(t`X connected. Your rank is unlocked.`);
        try {
          const workspace = await fetchWorkspace(token);
          if (activeTokenRef.current === token && workspace.kind === "result") {
            // A confirmed verification is not undone by a stale read immediately after submission.
            applyWorkspace({ ...workspace, verification: next, rank: verifiedRank(next, workspace.rank) });
          }
        } catch (error) {
          if (activeTokenRef.current === token) handleUserApiError(error);
        }
      }
    } catch (error) {
      if (activeTokenRef.current === token) handleUserApiError(error);
      throw error;
    }
  };

  const copyInvitation = async (code?: string) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(makeInvitationUrl(code, true));
      setInviteLinkCopied(true);
      showToast(t`Invite link copied.`);
      window.setTimeout(() => setInviteLinkCopied(false), 1400);
    } catch (error) {
      showToast(
        errorMessage(error) === GENERIC_ERROR
          ? t`Couldn’t copy the invite link. Try again.`
          : localizeWaitlistMessage(errorMessage(error)), "error",
      );
    }
  };

  const shareImageFeedback = (action: ShareImageAction, result: Exclude<ShareImageActionResult, "cancelled">) => {
    if (result === "clipboard") return t`Copied!`;
    if (result === "share") return t`Selection successful`;
    if (result === "download") return t`Download started.`;
    if (result === "tab") return t`Image opened in a new tab. Long press to save.`;
    if (isIOS()) {
      return action === "copy" ? t`Long press the image and tap Copy.` : t`Long press the image and tap Save Image.`;
    }
    if (isAndroid()) {
      return action === "copy" ? t`Long press the image and tap Copy image.` : t`Long press the image and tap Download image.`;
    }
    return action === "copy" ? t`Long press the image to save or copy.` : t`Long press the image to save to your album.`;
  };

  const closeSharePreview = () => {
    setSharePreview((current) => {
      if (current?.url.startsWith("blob:")) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const applyShareResult = (action: ShareImageAction, result: ShareImageActionResult, blob: Blob) => {
    if (result === "cancelled") return;
    const tip = shareImageFeedback(action, result);
    if (result === "preview") {
      setSharePreview((current) => {
        if (current?.url.startsWith("blob:")) URL.revokeObjectURL(current.url);
        return { url: createImagePreviewUrl(blob), tip };
      });
    }
    showToast(tip, result === "download" || result === "clipboard" ? "success" : "info");
  };

  return (
    <WaitlistActionScope>
    <main className={styles.page} data-stage={stage} data-referral={Boolean(referralOutcome)}>
      <a className={styles.skipLink} href="#waitlist-content">
        <Trans>Skip to waitlist</Trans>
      </a>
      <div className={styles.ambientBackdrop} aria-hidden="true">
        {stage === "boot" ? null : stage === "gate" && !referralOutcome ? (
          <div className={styles.gateBackdrop}>
            <Image src="/assets/waitlist/waitlist-intro.png" alt="" fill sizes="70vw" priority />
          </div>
        ) : stage === "email" || stage === "verify" || stage === "result-pending" ? (
          <div className={styles.flowBackdrop}>
            <Image
              src={WAITLIST_VERIFICATION_ART_SRC}
              alt=""
              fill
              sizes="(max-width: 880px) 100vw, 50vw"
              priority
            />
          </div>
        ) : null}
      </div>
      <ConsumerHeader active="waitlist" placement="page" />

      <section className={styles.stage} id="waitlist-content" aria-live="polite">
        {stage === "boot" && (
          <div className={styles.formStage}>
            <span className={styles.eyebrow}>
              <Trans>Waitlist</Trans>
            </span>
            <h1>
              <Trans>Loading your session...</Trans>
            </h1>
            <p>
              <Trans>Checking invite, result, and sign-in state.</Trans>
            </p>
          </div>
        )}

        {stage === "gate" && referralOutcome && (
          <div className={styles.resultStage} data-shared-result="true">
            <PersonaPoster outcome={referralOutcome} />
            <aside className={`${styles.resultPanel} ${styles.referralResultPanel}`}>
              <span className={styles.eyebrow}>
                <Trans>A result was shared with you</Trans>
              </span>
              <h1>
                <Trans>Do you trade like they do?</Trans>
              </h1>
              <p>
                <Trans>Different score, same type—or something else entirely? Six decisions reveal how you trade when it gets real.</Trans>
              </p>
              <div className={styles.referralActions}>
                {hasOwnResult ? (
                  <div className={styles.referralReturn}>
                    <small>
                      <Trans>Your result is saved as {savedPersonaName}.</Trans>
                    </small>
                    <WaitlistButton className={styles.primaryButton} onAction={viewSavedResult}>
                      <Trans>View my result</Trans>
                    </WaitlistButton>
                  </div>
                ) : loggedIn ? (
                  <WaitlistButton className={styles.primaryButton} onAction={beginFromReferral}>
                    <Trans>Find my trader type</Trans>
                  </WaitlistButton>
                ) : (
                  <>
                    <WaitlistButton className={styles.primaryButton} onAction={beginFromReferral}>
                      <Trans>Find my trader type</Trans>
                    </WaitlistButton>
                    <WaitlistButton className={styles.textButton} onClick={beginResultRecovery}>
                      <Trans>Already tested? View my result</Trans>
                    </WaitlistButton>
                    {gateError && (
                      <div className={styles.referralError} role="alert">
                        <small>{localizeWaitlistMessage(gateError)}</small>
                      </div>
                    )}
                  </>
                )}
                {loggedIn && (
                  <AccountSession
                    email={verifiedEmail}
                    label={t`Verified as`}
                    place="copy"
                    onSignOut={signOutWaitlist}
                  />
                )}
              </div>
            </aside>
          </div>
        )}

        {stage === "gate" && !referralOutcome && (
          <div className={styles.gateStage}>
            <div className={styles.gateCopy}>
              <h1>
                <Trans>How do you trade<br />{" "}when it gets <em>real?</em></Trans>
              </h1>
              <p>
                <Trans>Six decisions reveal your risk, signal, and social instincts.</Trans>
              </p>
            </div>
            <form className={styles.gateForm} onSubmit={(event) => event.preventDefault()}>
              <WaitlistButton
                className={styles.primaryButton}
                type="button"
                onAction={beginWithoutInvite}
              >
                <Trans>Start the test</Trans>
              </WaitlistButton>
              <div className={styles.gateFormMeta}>
                <WaitlistButton className={styles.textButton} onClick={beginResultRecovery}>
                  <Trans>Already tested? View my result</Trans>
                </WaitlistButton>
              </div>
            </form>
          </div>
        )}

        {stage === "quiz" && !currentQuestion && (
          <div className={styles.formStage}>
            <span className={styles.eyebrow}>
              <Trans>Waitlist</Trans>
            </span>
            <h1>
              <Trans>Couldn’t load the test.</Trans>
            </h1>
            <p>
              <Trans>The questions didn’t come through. Check your connection and try again.</Trans>
            </p>
            <form onSubmit={(event) => event.preventDefault()}>
              <WaitlistButton className={styles.primaryButton} onClick={() => setStage("gate")}>
                <Trans>Back to start</Trans>
              </WaitlistButton>
            </form>
              </div>
        )}

        {stage === "quiz" && currentQuestion && (
          <div className={styles.quizStage}>
            {loggedIn && (
              <AccountSession
                email={verifiedEmail}
                label={t`Verified as`}
                place="scene"
                onSignOut={signOutWaitlist}
              />
            )}
            <div className={styles.quizLayout}>
              <QuestionArtwork question={currentQuestion} questions={questions} />
              <div className={styles.questionPanel}>
                <div className={styles.quizTopline}>
                  <WaitlistButton type="button" onClick={goBack}>
                    <Image src="/assets/waitlist/arrow-right.svg" alt="" width={16} height={16} aria-hidden="true" />
                    <Trans>Back</Trans>
                  </WaitlistButton>
                  <p>
                    <Trans>Question</Trans>{" "}<strong>{questionIndex + 1}</strong>{" / "}{questions.length}
                  </p>
                </div>
                <div
                  className={styles.progress}
                  aria-label={t`Question ${questionIndex + 1} of ${questions.length}`}
                  style={{
                    "--quiz-progress": `${questionIndex === 0 ? 0 : ((questionIndex + 1) / questions.length) * 100}%`,
                  } as CSSProperties}
                >
                  <i aria-hidden="true" />
                </div>
                <h1>{localizedQuestionPrompt(currentQuestion)}</h1>
                <div className={styles.optionList}>
                  {currentQuestion.options.map((option) => {
                    const selected = answers[currentQuestion.questionId] === option.optionId;
                    return (
                      <WaitlistButton
                        type="button"
                        data-selected={selected}
                        key={option.optionId}
                        onClick={() => {
                          void answerQuestion(option.optionId);
                        }}
                      >
                        <Image
                          src={selected ? "/assets/waitlist/checkbox-selected.svg" : "/assets/waitlist/checkbox.svg"}
                          alt=""
                          width={26}
                          height={26}
                          aria-hidden="true"
                        />
                        <span>{localizedOptionLabel(option)}</span>
                      </WaitlistButton>
                    );
                  })}
                </div>
                {quizWarning ? (
                  <div className={styles.quizWarning} role="alert">
                    <small>{localizeWaitlistMessage(quizWarning)}</small>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {stage === "email" && (
          <div className={styles.formStage}>
            <h1>{authIntent === "recover" ? t`Find your result.` : t`Save your result`}</h1>
            <p>
              {authIntent === "recover"
                ? t`Enter the email you used for the test.`
                : t`Return to your result anytime and stay updated on SmartX.`}
            </p>
            <form onSubmit={(event) => event.preventDefault()}>
              <label className={styles.emailFieldLabel} htmlFor="waitlist-email">
                <Trans>Email address</Trans>
              </label>
              <div className={styles.inlineField}>
                <input
                  id="waitlist-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t`Email address`}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setRecoveryError("");
                  }}
                  aria-invalid={Boolean(recoveryError)}
                  required
                />
                <WaitlistButton className={styles.primaryButton} type="submit" onAction={submitEmail}>
                  <Trans>Send code</Trans>
                </WaitlistButton>
              </div>
              {recoveryError ? <small className={styles.formError} role="alert">{localizeWaitlistMessage(recoveryError)}</small> : null}
              {authIntent === "recover" && (
                <WaitlistButton className={styles.recoveryBack} onClick={() => { setRecoveryError(""); setStage("gate"); }}>
                  <Trans>← Back</Trans>
                </WaitlistButton>
              )}
            </form>
          </div>
        )}

        {stage === "verify" && (
          <div className={styles.formStage}>
            <span className={styles.eyebrow}>
              <Trans>Verification</Trans>
            </span>
            <h1>
              <Trans>Check your inbox</Trans>
            </h1>
            <p>
              <Trans>Enter the code sent to <b>{email}</b>.</Trans>
            </p>
            <form onSubmit={(event) => event.preventDefault()}>
              <div className={styles.otpLabelRow}>
                <label htmlFor="waitlist-otp">
                  <Trans>Verification code</Trans>
                </label>
                <WaitlistButton
                  className={styles.otpClearButton}
                  type="button"
                  disabled={otpSubmitting || (!otp && !otpError)}
                  onClick={clearOtpEntry}
                >
                  <Trans>Clear</Trans>
                </WaitlistButton>
              </div>
              <div className={styles.inlineField}>
                <div className={styles.otpField} aria-busy={otpSubmitting || undefined}>
                  <input
                    ref={otpInputRef}
                    className={styles.otpInput}
                    id="waitlist-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    placeholder={t`Six-digit code`}
                    onChange={(event) => updateOtpValue(event.target.value)}
                    onPaste={(event) => {
                      const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
                      if (!pasted) return;
                      event.preventDefault();
                      updateOtpValue(pasted);
                    }}
                    disabled={otpSubmitting}
                    aria-invalid={Boolean(otpError)}
                    aria-describedby={otpError ? "otp-error" : otpSubmitting ? "otp-status" : undefined}
                    autoFocus
                    required
                  />
                  <div className={styles.otpBoxes} aria-hidden="true">
                    {Array.from({ length: 6 }, (_, index) => (
                      <span
                        key={index}
                        data-active={index === Math.min(otp.length, 5) && otp.length < 6 ? "true" : undefined}
                        data-filled={otp[index] ? "true" : undefined}
                      >
                        {otp[index] || ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.otpFeedback} aria-live="polite">
                {otpSubmitting ? (
                  <small className={styles.otpStatus} id="otp-status" role="status"><Trans>Checking code…</Trans></small>
                ) : otpError ? (
                  <small className={styles.formError} id="otp-error" role="alert">{localizeWaitlistMessage(otpError)}</small>
                ) : null}
              </div>
              <WaitlistButton
                className={`${styles.primaryButton} ${styles.otpSubmitButton}`}
                type="button"
                data-verifying={otpSubmitting ? "true" : undefined}
                disabled={otp.length !== 6 || otpSubmitting}
                onClick={() => { void submitOtp(otp); }}
              >
                {otpSubmitting ? <Trans>Checking code…</Trans> : <Trans>Continue</Trans>}
              </WaitlistButton>
              <div className={styles.formMeta}>
                <WaitlistButton type="button" disabled={otpSubmitting} onClick={changeEmail}>
                  <Trans>Change Email</Trans>
                </WaitlistButton>
                <WaitlistButton type="button" disabled={otpSubmitting || otpCooldown > 0} onAction={resendCode}>
                  {otpCooldown > 0 ? t`Resend Code (${formatClock(otpCooldown)})` : t`Resend Code`}
                </WaitlistButton>
              </div>
            </form>
          </div>
        )}

        {stage === "result-pending" && (
          <div className={styles.formStage}>
            <h1>
              <Trans>Couldn’t load your result</Trans>
            </h1>
            <p>
              <Trans>Please try again in a moment.</Trans>
            </p>
            <AccountSession
              email={verifiedEmail}
              label={t`Signed in as`}
              onSignOut={signOutWaitlist}
            />
            <WaitlistButton className={styles.primaryButton} onAction={revealResult}>
              <Trans>Try again</Trans>
            </WaitlistButton>
          </div>
        )}

        {stage === "result" && ownOutcome && (
          <div className={styles.resultStage}>
            {loggedIn ? <AccountSession resultIdentity email={verifiedEmail} label={t`Signed in as`} xUsername={shareCompleted ? verification.xUser?.username : undefined} onSignOut={signOutWaitlist} /> : null}
            <PersonaPoster key={ownOutcome.persona.mark} outcome={ownOutcome} />
            {loggedIn ? (
            <aside className={styles.resultPanel}>
              <div className={styles.rankBlock} data-boosted={shareCompleted}>
                <RankingInfo>
                {shareCompleted ? <>
                {rank !== null ? <strong key={rank}>#{rank.toLocaleString("en-US")}</strong> : <p className={styles.rankSync}><Trans>Your share is verified. Your ranking is updating.</Trans></p>}
                </> : <div className={styles.rankLocked}>
                  <Image src="/assets/waitlist/result/lock.svg" alt={t`Rank locked`} width={48} height={48} />
                  {verification.status === "pending" ? <p role="status"><Trans>We’re checking your post</Trans></p> : null}
                </div>}
                </RankingInfo>
                <div className={styles.resultActions}>
                    <button
                      type="button"
                      className={styles.downloadButton}
                      disabled={!ownInviteCode || !shareResultCode}
                      onClick={() => setDownloadOpen(true)}
                    >
                      <Image src="/assets/waitlist/download.svg" alt="" width={20} height={20} aria-hidden="true" />
                      <Trans>Download</Trans>
                    </button>
                  <WaitlistButton className={styles.shareButton} disabled={!ownInviteCode} onAction={shareResult}>
                    {verification.status === "pending" ? t`Check verification` : shareCompleted ? t`Share result` : t`Share to unlock`}
                  </WaitlistButton>
                </div>
              </div>
              <section className={styles.invitationDeck} aria-label={t`Your invitation link`}>
                <header>
                  <span>
                    <Trans>Invite friends</Trans>
                  </span>
                  {verifiedFriends !== null ? (
                    <p className={styles.inviteCount}>
                      <Plural value={verifiedFriends} one="# verified friend" other="# verified friends" />
                    </p>
                  ) : null}
                </header>
                <div className={styles.inviteFields}>
                  <div className={styles.primaryInviteCard} data-empty={ownInviteCode ? undefined : "true"}>
                    <div>
                      <span><Trans>Your link</Trans></span>
                      <strong title={ownInvitationUrl || undefined}>
                        {ownInvitationUrl || t`Invite link is being prepared`}
                      </strong>
                    </div>
                    <WaitlistButton
                      type="button"
                      lock={false}
                      disabled={!ownInviteCode}
                      aria-label={inviteLinkCopied ? t`Copied` : t`Copy invitation link`}
                      title={inviteLinkCopied ? t`Copied` : t`Copy invitation link`}
                      onClick={() => { void copyInvitation(ownInviteCode); }}
                    >
                      <Image src="/assets/waitlist/copy.svg" alt="" width={20} height={20} aria-hidden="true" />
                      <span className={styles.visuallyHidden} role="status">{inviteLinkCopied ? t`Copied` : ""}</span>
                    </WaitlistButton>
                  </div>
                </div>
                <ol className={styles.inviteSteps}>
                  <li><Trans>Friend joins via your link and connects X</Trans></li>
                  <li><Trans>You earn +5 Boost</Trans></li>
                </ol>
                <p className={styles.mobileInviteExplanation}><Trans>A friend joins via your link and connects X. You earn +5 Boost.</Trans></p>
              </section>
              <section className={styles.optionalCommunity} aria-label={t`Stay connected`}>
                <span><Trans>Stay connected</Trans></span>
                <div>
                  <button type="button" onClick={() => openCommunity("telegram")}><Image src="/assets/waitlist/telegram.svg" alt="" width={20} height={20} /><Trans>Join Telegram</Trans><span aria-hidden="true">↗</span></button>
                  <button type="button" onClick={() => openCommunity("x")}><Image src="/assets/waitlist/x.svg" alt="" width={20} height={20} /><Trans>Follow SmartX</Trans><span aria-hidden="true">↗</span></button>
                  <a href="https://x.com/David_MetaWorld" target="_blank" rel="noopener noreferrer"><Image src="/assets/waitlist/x.svg" alt="" width={20} height={20} /><Trans>Follow SmartX Founder</Trans><span aria-hidden="true">↗</span></a>
                </div>
              </section>
            </aside>
            ) : null}
          </div>
        )}
      </section>
    </main>
    {loggedIn && stage === "result" ? <ShareVerificationDialog key={userInfo?.userId ?? userToken} open={verificationOpen} onClose={() => setVerificationOpen(false)} verification={verification} onSubmit={verifySharedPost} onShare={shareResult} /> : null}
    {loggedIn && stage === "result" && shareResultCode ? <DownloadDialog key={userToken} open={downloadOpen} onClose={() => setDownloadOpen(false)} inviteCode={ownInviteCode} locale={locale} result={shareResultCode} onResult={(action, blob) => applyShareResult("download", action, blob)} onError={() => showToast(t`Couldn’t export the image. Try again.`, "error")} /> : null}
    <ResultToast toast={toast} onDismiss={dismissToast} />
    {sharePreview ? (
      <div className={styles.sharePreview} onClick={closeSharePreview}>
        <p>{sharePreview.tip}</p>
        {/* Native img so mobile long-press copy/save works. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sharePreview.url} alt={t`Share image`} onClick={(event) => event.stopPropagation()} />
        <WaitlistButton type="button" lock={false} onAction={closeSharePreview}>
          <Trans>Close</Trans>
        </WaitlistButton>
      </div>
    ) : null}
    <div className={styles.artPrefetch} aria-hidden="true">
      {QUIZ_ART_SRCS.map((src) => (
        // Prefetch into the HTTP cache before the quiz mounts.
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" />
      ))}
    </div>
    </WaitlistActionScope>
  );
}
