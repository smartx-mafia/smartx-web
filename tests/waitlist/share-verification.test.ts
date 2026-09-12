import assert from "node:assert/strict";
import test from "node:test";
import { parseXPostUrl, readShareVerification, readTwitterBindStatus, verificationFromTwitterBind, verifiedInviteCount, verifiedRank } from "../../src/lib/waitlist/share-verification";
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
    "https://x.com/a/status/123?x=" + "x".repeat(500)]) {
    assert.equal(parseXPostUrl(value), null, value);
  }
});

test("legacy click flags and malformed responses never verify a share", () => {
  for (const raw of [undefined, null, true, 1, { shareCompleted: 1 }, { status: "success" }]) {
    assert.deepEqual(readShareVerification(raw), { status: "unverified" });
  }
});

test("verified bind can omit an X identity for fake verification", () => {
  assert.deepEqual(readShareVerification({ status: "verified" }), { status: "verified" });
  assert.deepEqual(readShareVerification({
    status: "verified",
    xUser: { id: "123", username: "example" },
  }), { status: "verified", xUser: { id: "123", username: "example" } });
});

test("an explicit verified response unlocks a valid server rank", () => {
  const verified = readShareVerification({ status: "verified" });
  assert.equal(verifiedRank(verified, 42), 42);
  for (const status of ["unverified", "pending", "rejected"] as const) assert.equal(verifiedRank({ status }, 42), null);
  for (const rank of [null, undefined, 0, -1, "42", NaN, Infinity, 1.5]) assert.equal(verifiedRank(verified, rank), null);
});

test("twitter bind status maps pending, success, failure and restore", () => {
  assert.deepEqual(verificationFromTwitterBind({ twitterBound: 0 }), { status: "unverified" });
  assert.deepEqual(verificationFromTwitterBind({ twitterBound: 1 }), { status: "verified" });
  assert.deepEqual(verificationFromTwitterBind({
    twitterBound: 0,
    bind: {
      status: 1,
      tweetLink: "https://x.com/foo/status/123?s=20",
      twitterAccount: "",
      failCode: 0,
      failMessage: "",
    },
  }), { status: "pending", postUrl: "https://x.com/foo/status/123" });
  assert.deepEqual(verificationFromTwitterBind({
    bind: {
      status: 2,
      tweetLink: "https://x.com/foo/status/123",
      twitterAccount: "foo",
      failCode: 0,
      failMessage: "",
    },
  }), { status: "verified", postUrl: "https://x.com/foo/status/123", xUser: { username: "foo" } });
  assert.deepEqual(verificationFromTwitterBind({
    bind: {
      status: 2,
      tweetLink: "https://x.com/foo/status/123",
      twitterAccount: "",
      failCode: 0,
      failMessage: "",
    },
  }), { status: "verified", postUrl: "https://x.com/foo/status/123" });
  assert.deepEqual(verificationFromTwitterBind({
    bind: {
      status: 3,
      tweetLink: "https://x.com/foo/status/123",
      twitterAccount: "",
      failCode: 8,
      failMessage: "Your tweet must contain your own invite link (?invite=...).",
    },
  }), {
    status: "rejected",
    postUrl: "https://x.com/foo/status/123",
    reason: "Your tweet must contain your own invite link (?invite=...).",
  });
});

test("bind status parser rejects unknown payloads", () => {
  assert.equal(readTwitterBindStatus(null), null);
  assert.equal(readTwitterBindStatus({ status: 9 }), null);
  assert.deepEqual(readTwitterBindStatus({
    status: 0,
    tweetLink: "",
    twitterAccount: "",
    failCode: 0,
    failMessage: "",
  }), { status: 0, tweetLink: "", twitterAccount: "", failCode: 0, failMessage: "" });
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
