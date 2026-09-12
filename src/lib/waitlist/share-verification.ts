/** Frontend integration contract; never infer verification from legacy click flags. */
export type ShareVerification = {
  status: "unverified" | "pending" | "verified" | "rejected";
  postUrl?: string;
  xUser?: { id: string; username: string };
  reason?: string;
};

const POST_HOSTS = new Set([
  "x.com", "www.x.com", "mobile.x.com",
  "twitter.com", "www.twitter.com", "mobile.twitter.com",
]);

export function parseXPostUrl(input: string): { postId: string; url: string } | null {
  const value = input.trim();
  if (!value || value.length > 2048 || /\s/.test(value)) return null;
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

/** The endpoint is deliberately opt-in until the backend contract is confirmed. */
export function verificationEndpoint(value: string | undefined): string | null {
  const path = value?.trim();
  if (!path || !/^\/user\/[a-zA-Z0-9_/-]+$/.test(path)) return null;
  if (path.replace(/\/+$/, "") === "/user/share_complete") return null;
  return path;
}

export function readShareVerification(raw: unknown): ShareVerification {
  const fallback: ShareVerification = { status: "unverified" };
  if (!raw || typeof raw !== "object") return fallback;
  const value = raw as Partial<ShareVerification>;
  if (!["unverified", "pending", "verified", "rejected"].includes(value.status ?? "")) return fallback;
  const xUser = value.xUser;
  if (value.status === "verified" && (!xUser || typeof xUser.id !== "string" || !/^\d+$/.test(xUser.id) || typeof xUser.username !== "string" || !/^[a-zA-Z0-9_]{1,15}$/.test(xUser.username))) return fallback;
  return {
    status: value.status!,
    postUrl: typeof value.postUrl === "string" ? parseXPostUrl(value.postUrl)?.url : undefined,
    xUser: value.status === "verified" ? xUser : undefined,
    reason: typeof value.reason === "string" ? value.reason : undefined,
  };
}

export function verifiedRank(verification: ShareVerification, rank: unknown): number | null {
  return verification.status === "verified" && typeof rank === "number" && Number.isSafeInteger(rank) && rank > 0 ? rank : null;
}

export function verifiedInviteCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
