import { isUnlockedResult, isWaitlistApiError, type CommunityChannel, type CommunityCompleteResult, type MyResult } from "./types";

const LEGACY_LOCK_WAIT_MS = 2_200;

/** Temporary product-review bridge. Never enabled in a production build or against production APIs. */
export function canUsePrototypeCommunityBridge(config: {
  enabled?: string;
  nodeEnv?: string;
  pageOrigin: string;
  apiBase: string;
}) {
  if (config.enabled !== "1" || config.nodeEnv !== "development") return false;
  try {
    const page = new URL(config.pageOrigin);
    const api = new URL(config.apiBase);
    return ["http:", "https:"].includes(page.protocol)
      && ["localhost", "127.0.0.1", "[::1]"].includes(page.hostname)
      && api.origin === "https://waitlist-test-api.smartx.io"
      && api.pathname === "/" && !api.search && !api.hash && !api.username && !api.password;
  } catch {
    return false;
  }
}

export function createPrototypeCommunityBridge(deps: {
  enabled: () => boolean;
  isCurrentSession: (token: string) => boolean;
  complete: (channel: CommunityChannel, token: string) => Promise<CommunityCompleteResult>;
  getResult: (token: string) => Promise<MyResult>;
  wait: (ms: number) => Promise<void>;
}) {
  const inFlight = new Map<string, Promise<MyResult>>();

  return function resolvePrototypeResult(token: string, initial: MyResult): Promise<MyResult> {
    const active = () => Boolean(token) && deps.enabled() && deps.isCurrentSession(token);
    if (!active() || !initial.submitted || initial.locked !== true || isUnlockedResult(initial)) {
      return Promise.resolve(initial);
    }
    const existing = inFlight.get(token);
    if (existing) return existing;

    const run = async () => {
      let flags: Pick<CommunityCompleteResult, "telegramCompleted" | "xCompleted"> = initial;
      let wrote = false;
      for (const channel of ["telegram", "x"] as const) {
        if (flags?.[channel === "telegram" ? "telegramCompleted" : "xCompleted"] === 1) continue;
        if (wrote) await deps.wait(LEGACY_LOCK_WAIT_MS);
        if (!active()) return initial;
        try {
          flags = await deps.complete(channel, token);
        } catch (error) {
          // The old endpoint has a shared per-user two-second lock. Retry that error once only.
          if (!isWaitlistApiError(error) || error.code !== 701 || error.message !== "service is busy") throw error;
          await deps.wait(LEGACY_LOCK_WAIT_MS);
          if (!active()) return initial;
          flags = await deps.complete(channel, token);
        }
        wrote = true;
      }
      // Also avoid re-reading my_result inside its own two-second lock window.
      await deps.wait(LEGACY_LOCK_WAIT_MS);
      return active() ? deps.getResult(token) : initial;
    };

    const request = run().finally(() => { inFlight.delete(token); });
    inFlight.set(token, request);
    return request;
  };
}
