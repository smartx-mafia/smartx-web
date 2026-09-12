# Waitlist flow · 2026-09-09

Current confirmed flow. Integration details and backend dependencies are in [the share verification handoff](./waitlist-share-verification.md).

```mermaid
flowchart TD
  A[Open Waitlist and restore session] --> B{Saved result?}
  B -- Yes, direct entry --> R[Show full personality result]
  B -- Friend entry --> F[Show friend's result and view-my-result / test actions]
  B -- No --> Q[Answer six API-provided questions]
  F -- Take test --> Q
  F -- View my result --> E[Email sign-in when needed]
  Q --> E
  E --> O[Verify six-digit email code]
  O --> S[Save or retrieve the personality result]
  S --> R
  R --> G{Share verified by server?}
  G -- No --> L[Rank locked; not on eligible leaderboard]
  G -- Yes --> V[Show server rank and connected X account]
  L --> X[Open X intent with own invite link]
  X --> P[User publishes publicly and pastes post URL]
  L -- Already shared --> P
  P --> C[Frontend validates official post URL format]
  C --> API[Server checks post, X uniqueness and own invite link]
  API -- Pending --> W[Show pending; resume on return or refresh]
  API -- Rejected --> T[Explain reason and allow retry]
  T --> P
  W --> API
  API -- Verified --> V
  API -- Verified --> I[Server counts one valid invite for inviter, if any]
  R --> D[Download personality card or copy own invite link]
  R --> OPT[Optional: open Telegram or follow SmartX on X]
```

## Entry and authentication

- Direct entry does not require an invitation. Valid friend links prefill the inviter relationship.
- Logged-in visitors to a friend's link still see the friend's public persona first and retain a way to view their own result.
- Quiz drafts, OTP auto-submit at six digits, manual retry, resend, changing email, result recovery and sign-out remain available.
- Once the email is verified and a result exists, neither community flags nor share status block the personality result.
- In normal mode, an older backend withholding personality data produces an unavailable/retry state. The explicitly authorized local-only prototype bridge (2026-09-10) may mark missing legacy community tasks complete on the test backend, then fetch the real card. It never fabricates results or verifies a share; see the handoff for the guarded opt-in.

## Sharing and eligibility

- Opening intent is only starting a share. It never awards Boost, binds X or unlocks a rank.
- The return-link dialog can be reopened without reposting. It supports invalid URL, submitting, pending, rejection and verified states.
- Only server-confirmed verification counts. Legacy `shareCompleted` is not proof of verification.
- Unverified users are excluded from the eligible leaderboard by the backend, not merely hidden by frontend styling.
- A verified post binds the actual author's stable X user ID for this activity; no OAuth or X-based login is introduced.
- Ranking and verified invitation counts are server values. No local score or invitation increments.
- If B joined via A, B posts **B's** invite link; after B verifies, the server credits A once.
- Telegram / follow-X actions are optional outbound links. Clicking them is not presented as verified membership or following.

## Backend readiness

The post-verification endpoint and response are awaiting backend confirmation. See the handoff before setting `NEXT_PUBLIC_WAITLIST_SHARE_VERIFY_PATH`. The default frontend does not call an invented endpoint or the old share-completion endpoint.
