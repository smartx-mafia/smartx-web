import assert from "node:assert/strict";
import test from "node:test";
import { canUsePrototypeCommunityBridge, createPrototypeCommunityBridge } from "../../src/lib/waitlist/prototype-community-bridge";
import { readShareVerification, verifiedRank } from "../../src/lib/waitlist/share-verification";
import { WaitlistApiError, type CommunityChannel, type CommunityCompleteResult, type MyResult } from "../../src/lib/waitlist/types";

const config = { enabled: "1", nodeEnv: "development", pageOrigin: "http://127.0.0.1:3012", apiBase: "https://waitlist-test-api.smartx.io" };
const locked: MyResult = { submitted: true, locked: true, telegramCompleted: 0, xCompleted: 0 };
const card = { submitted: true, locked: false, resultId: "review", personaId: "AIM", rank: 42, shareCompleted: 1 } as MyResult;

function fixture() {
  const calls: string[] = [];
  const flags: CommunityCompleteResult = { telegramCompleted: 0, xCompleted: 0, unlocked: false };
  const deps = {
    enabled: () => true,
    isCurrentSession: (token: string): boolean => token === "review-token",
    complete: async (channel: CommunityChannel, token: string): Promise<CommunityCompleteResult> => {
      assert.equal(token, "review-token");
      calls.push(channel);
      flags[channel === "telegram" ? "telegramCompleted" : "xCompleted"] = 1;
      flags.unlocked = flags.telegramCompleted === 1 && flags.xCompleted === 1;
      return { ...flags };
    },
    getResult: async (token: string): Promise<MyResult> => { assert.equal(token, "review-token"); calls.push("read-result"); return card; },
    wait: async (ms: number) => { calls.push(`wait:${ms}`); },
  };
  return { calls, flags, deps };
}

test("prototype bridge requires explicit opt-in, local development and the exact test API", () => {
  assert.equal(canUsePrototypeCommunityBridge(config), true);
  assert.equal(canUsePrototypeCommunityBridge({ ...config, pageOrigin: "http://localhost:3012" }), true);
  for (const override of [
    { enabled: undefined }, { enabled: "0" }, { nodeEnv: "production" }, { nodeEnv: "test" },
    { pageOrigin: "https://smartx.io" }, { pageOrigin: "http://localhost.evil.test" }, { pageOrigin: "file:///tmp/review" },
    { apiBase: "https://waitlist-api.smartx.io" }, { apiBase: "http://waitlist-test-api.smartx.io" },
    { apiBase: "https://waitlist-test-api.smartx.io.evil.test" }, { apiBase: "https://waitlist-test-api.smartx.io/other" },
    { apiBase: "https://name:secret@waitlist-test-api.smartx.io" }, { apiBase: "not-a-url" },
  ]) assert.equal(canUsePrototypeCommunityBridge({ ...config, ...override }), false);
});

test("submitted, locked results complete the two channels sequentially before re-reading", async () => {
  const { calls, deps } = fixture();
  const result = await createPrototypeCommunityBridge(deps)("review-token", locked);
  assert.equal(result, card);
  assert.deepEqual(calls, ["telegram", "wait:2200", "x", "wait:2200", "read-result"]);
  // Legacy unlock and share-click flags must not unlock the new leaderboard.
  assert.equal(verifiedRank(readShareVerification(undefined), 42), null);
});

test("disabled bridge, missing session, unsubmitted quiz and existing full card never mutate", async () => {
  for (const scenario of ["disabled", "signed-out", "unsubmitted", "full-card"] as const) {
    const { calls, deps } = fixture();
    if (scenario === "disabled") deps.enabled = () => false;
    if (scenario === "signed-out") deps.isCurrentSession = () => false;
    const initial: MyResult = scenario === "unsubmitted" ? { ...locked, submitted: false } : scenario === "full-card" ? card : locked;
    assert.equal(await createPrototypeCommunityBridge(deps)("review-token", initial), initial);
    assert.deepEqual(calls, []);
  }
});

test("already-completed channels are skipped, including partially successful retries", async () => {
  const { calls, deps, flags } = fixture();
  flags.telegramCompleted = 1;
  await createPrototypeCommunityBridge(deps)("review-token", { ...locked, telegramCompleted: 1 });
  assert.deepEqual(calls, ["x", "wait:2200", "read-result"]);
});

test("simultaneous requests for the same session share one mutation sequence", async () => {
  const { calls, deps } = fixture();
  const resolve = createPrototypeCommunityBridge(deps);
  const first = resolve("review-token", locked);
  const second = resolve("review-token", locked);
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(calls.filter(call => call === "telegram").length, 1);
  assert.equal(calls.filter(call => call === "x").length, 1);
});

test("old endpoint's busy response gets only one delayed retry", async () => {
  const { calls, deps } = fixture();
  let attempts = 0;
  const complete = deps.complete;
  deps.complete = async (channel, token) => {
    if (++attempts === 1) { calls.push("busy"); throw new WaitlistApiError(701, "service is busy", "user"); }
    return complete(channel, token);
  };
  await createPrototypeCommunityBridge(deps)("review-token", locked);
  assert.deepEqual(calls, ["busy", "wait:2200", "telegram", "wait:2200", "x", "wait:2200", "read-result"]);
});

test("persistent busy errors stop after one retry instead of looping", async () => {
  const { calls, deps } = fixture();
  deps.complete = async () => { calls.push("busy"); throw new WaitlistApiError(701, "service is busy", "user"); };
  await assert.rejects(createPrototypeCommunityBridge(deps)("review-token", locked));
  assert.deepEqual(calls, ["busy", "wait:2200", "busy"]);
});

test("authentication failures do not trigger later writes and do not poison a retry", async () => {
  const { calls, deps } = fixture();
  const complete = deps.complete;
  deps.complete = async () => { throw new WaitlistApiError(401, "Authorization error", "user"); };
  const resolve = createPrototypeCommunityBridge(deps);
  await assert.rejects(resolve("review-token", locked));
  assert.deepEqual(calls, []);
  deps.complete = complete;
  assert.equal(await resolve("review-token", locked), card);
});

test("sign-out during the delay prevents the second channel and final fetch", async () => {
  const { calls, deps } = fixture();
  deps.wait = async () => { deps.isCurrentSession = () => false; };
  assert.equal(await createPrototypeCommunityBridge(deps)("review-token", locked), locked);
  assert.deepEqual(calls, ["telegram"]);
});

test("no card is fabricated if the server still returns locked after completion", async () => {
  const { deps } = fixture();
  deps.getResult = async () => locked;
  assert.equal(await createPrototypeCommunityBridge(deps)("review-token", locked), locked);
});
