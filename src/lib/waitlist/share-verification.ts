/** Frontend share/bind state. Never infer this from legacy click flags. */
export type ShareVerification = {
  status: "unverified" | "pending" | "verified" | "rejected";
  postUrl?: string;
  xUser?: { id?: string; username: string };
  reason?: string;
};

export type TwitterBindStatus = {
  status: 0 | 1 | 2 | 3;
  tweetLink: string;
  twitterAccount: string;
  failCode: number;
  failMessage: string;
};

export const BIND_POLL_INTERVAL_MS = 4_000;
export const BIND_POLL_TIMEOUT_MS = 120_000;

const POST_HOSTS = new Set([
  "x.com", "www.x.com", "mobile.x.com",
  "twitter.com", "www.twitter.com", "mobile.twitter.com",
]);

const X_USERNAME = /^[a-zA-Z0-9_]{1,15}$/;

export function parseXPostUrl(input: string): { postId: string; url: string } | null {
  const value = input.trim();
  if (!value || value.length > 500 || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !POST_HOSTS.has(url.hostname) || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/([a-zA-Z0-9_]{1,15}\/status|i\/(?:web\/)?status)\/([1-9]\d{0,24})(?:\/(?:photo|video)\/[1-9]\d*)?\/?$/);
    if (!match) return null;
    return { postId: match[2], url: `https://x.com/${match[1]}/${match[2]}` };
  } catch {
    return null;
  }
}

export function readTwitterUsername(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const username = value.trim().replace(/^@/, "");
  return X_USERNAME.test(username) ? username : undefined;
}

function readXUser(raw: unknown): ShareVerification["xUser"] {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as { id?: unknown; username?: unknown };
  const username = readTwitterUsername(value.username);
  if (!username) return undefined;
  const id = typeof value.id === "string" && /^\d+$/.test(value.id) ? value.id : undefined;
  return id ? { id, username } : { username };
}

export function readTwitterBindStatus(raw: unknown): TwitterBindStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const status = Number(value.status);
  if (status !== 0 && status !== 1 && status !== 2 && status !== 3) return null;
  return {
    status,
    tweetLink: typeof value.tweetLink === "string" ? value.tweetLink : "",
    twitterAccount: typeof value.twitterAccount === "string" ? value.twitterAccount : "",
    failCode: Number(value.failCode) || 0,
    failMessage: typeof value.failMessage === "string" ? value.failMessage : "",
  };
}

function withPostUrl<T extends ShareVerification>(verification: T, tweetLink?: string): T {
  const postUrl = tweetLink ? parseXPostUrl(tweetLink)?.url : undefined;
  return postUrl ? { ...verification, postUrl } : verification;
}

export function verificationFromTwitterBind(input: {
  twitterBound?: unknown;
  bind?: TwitterBindStatus | null;
}): ShareVerification {
  const bind = input.bind;
  if (bind?.status === 1) {
    return withPostUrl({ status: "pending" }, bind.tweetLink);
  }
  if (bind?.status === 2) {
    const username = readTwitterUsername(bind.twitterAccount);
    return withPostUrl({
      status: "verified",
      ...(username ? { xUser: { username } } : {}),
    }, bind.tweetLink);
  }
  if (bind?.status === 3) {
    return withPostUrl({
      status: "rejected",
      reason: bind.failMessage || "REJECTED",
    }, bind.tweetLink);
  }
  if (input.twitterBound === 1) return { status: "verified" };
  return { status: "unverified" };
}

/** Accept explicit share states. Verified no longer requires an X identity (fake verify). */
export function readShareVerification(raw: unknown): ShareVerification {
  const fallback: ShareVerification = { status: "unverified" };
  if (!raw || typeof raw !== "object") return fallback;
  const value = raw as Partial<ShareVerification>;
  if (!["unverified", "pending", "verified", "rejected"].includes(value.status ?? "")) return fallback;
  const postUrl = typeof value.postUrl === "string" ? parseXPostUrl(value.postUrl)?.url : undefined;
  const xUser = value.status === "verified" ? readXUser(value.xUser) : undefined;
  const reason = typeof value.reason === "string" ? value.reason : undefined;
  return {
    status: value.status!,
    ...(postUrl ? { postUrl } : {}),
    ...(xUser ? { xUser } : {}),
    ...(reason ? { reason } : {}),
  };
}

export function verifiedRank(verification: ShareVerification, rank: unknown): number | null {
  return verification.status === "verified" && typeof rank === "number" && Number.isSafeInteger(rank) && rank > 0 ? rank : null;
}

export function verifiedInviteCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
