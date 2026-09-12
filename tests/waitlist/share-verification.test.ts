import assert from "node:assert/strict";
import test from "node:test";
import { parseXPostUrl, readShareVerification, verificationEndpoint, verifiedInviteCount, verifiedRank } from "../../src/lib/waitlist/share-verification";
import { decideWaitlistEntry, isOwnResultAvailable } from "../../src/lib/waitlist/routing";
import { isUnlockedResult, type MyResult } from "../../src/lib/waitlist/types";

test("post links accept official hosts and discard tracking without trusting the username", () => {
  for (const host of ["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"]) {
    assert.deepEqual(parseXPostUrl(` https://${host}/example/status/123456789?s=20#fragment `), {
      postId: "123456789", url: "https://x.com/example/status/123456789",
    });
  }
  for (const path of ["i/status", "i/web/status", "example/status"]) {
    assert.equal(parseXPostUrl(`https://x.com/${path}/123/photo/1`)?.url, `https://x.com/${path}/123`);
  }
});

test("reject profiles, malformed IDs, deceptive hosts, credentials and non-HTTPS links", () => {
  for (const value of ["", "x.com/a/status/123", "https://x.com/a", "https://x.com/a/status/0",
    "https://x.com/a/status/abc", "http://x.com/a/status/123", "javascript:alert(1)",
    "https://x.com.evil.test/a/status/123", "https://x.com@evil.test/a/status/123",
    "https://evil.test@x.com/a/status/123", "https://x.com:444/a/status/123",
    "https://x.com/a/status/123/anything", "https://x.com/a/status/123\n456", "https://t.co/abc",
    "https://x.com/a/status/123?x=" + "x".repeat(2048)]) {
    assert.equal(parseXPostUrl(value), null, value);
  }
});

test("the new endpoint is explicitly configured and cannot use the old click-completion route", () => {
  assert.equal(verificationEndpoint(undefined), null);
  for (const value of ["", "/user/share_complete", "/user/share_complete/", "//evil.test", "https://evil.test/user/verify", "/user/../share_complete"]) {
    assert.equal(verificationEndpoint(value), null);
  }
  assert.equal(verificationEndpoint(" /user/verify_share "), "/user/verify_share");
});

test("legacy click flags and malformed responses never verify a share", () => {
  for (const raw of [undefined, null, true, 1, { shareCompleted: 1 }, { status: "success" }, { status: "verified" },
    { status: "verified", xUser: { id: 123, username: "example" } },
    { status: "verified", xUser: { id: "123", username: "bad/name" } }]) {
    assert.deepEqual(readShareVerification(raw), { status: "unverified" });
  }
});

test("only an explicit verified response with an X identity unlocks a valid server rank", () => {
  const verified = readShareVerification({ status: "verified", xUser: { id: "123", username: "example" } });
  assert.equal(verifiedRank(verified, 42), 42);
  for (const status of ["unverified", "pending", "rejected"] as const) assert.equal(verifiedRank({ status }, 42), null);
  for (const rank of [null, undefined, 0, -1, "42", NaN, Infinity, 1.5]) assert.equal(verifiedRank(verified, rank), null);
});

test("verified invitation counts never fall back to unverified totals", () => {
  assert.equal(verifiedInviteCount(undefined), null);
  assert.equal(verifiedInviteCount("4"), null);
  assert.equal(verifiedInviteCount(-1), null);
  assert.equal(verifiedInviteCount(0), 0);
  assert.equal(verifiedInviteCount(4), 4);
});

test("signed-in users with a result go directly to the result regardless of old community flags", () => {
  assert.equal(decideWaitlistEntry({ hasFriendCard: false, loggedIn: true, submitted: true, unlocked: false }).stage, "result");
  assert.equal(isOwnResultAvailable({ loggedIn: true, submitted: true }), true);
});

test("friend entry keeps the public persona first and retains the view-own-result path", () => {
  assert.deepEqual(decideWaitlistEntry({ hasFriendCard: true, loggedIn: true, submitted: true }), { stage: "gate", entry: "friend" });
  assert.deepEqual(decideWaitlistEntry({ hasFriendCard: true, loggedIn: false, submitted: false }), { stage: "gate", entry: "friend" });
});

test("quiz resume and direct entry remain intact", () => {
  assert.equal(decideWaitlistEntry({ hasFriendCard: false, loggedIn: false, submitted: false, hasQuizProgress: true }).stage, "quiz");
  assert.equal(decideWaitlistEntry({ hasFriendCard: false, loggedIn: true, submitted: false }).stage, "quiz");
  assert.equal(decideWaitlistEntry({ hasFriendCard: false, loggedIn: false, submitted: false }).stage, "gate");
});

test("personality availability is independent of leaderboard and community eligibility", () => {
  assert.equal(isUnlockedResult({ submitted: true, locked: true } as MyResult), false);
  assert.equal(isUnlockedResult({ submitted: true, locked: true, resultId: "result", personaId: "SDP" } as MyResult), true);
});
