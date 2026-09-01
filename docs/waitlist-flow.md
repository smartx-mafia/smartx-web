# Waitlist flow

This document describes the current waitlist journey and distinguishes explicit user actions from automatic product behavior.

## Legend

- **User**: the person must click, type, choose, or return to continue.
- **System**: the product performs the step automatically after a user action or when the page opens.
- **External**: Telegram, X, email, or the native share surface is opened outside SmartX.

## End-to-end flow

```mermaid
flowchart TD
  A["System · Open /waitlist and restore session"] --> B{"System · Saved result found?"}
  B -- "Yes, unlocked" --> R["System · Show saved result and live rank"]
  B -- "Yes, still locked" --> U["System · Show unlock tasks"]
  B -- "No" --> C{"User · Choose an entry"}

  C -- "Start the test" --> Q["User · Answer six questions"]
  C -- "Already tested? View my result" --> E["User · Enter email and continue"]
  C -- "Open a friend's invite link" --> F["System · Load the friend's result"]
  F --> C2{"User · Choose what to do"}
  C2 -- "Find my trader type" --> Q
  C2 -- "View my saved result" --> E

  Q --> QD["System · Save quiz progress locally"]
  QD --> E
  E --> ER{"System · Is this an existing email?"}
  ER -- "New or existing" --> ES["System · Send the six-digit code and open verification"]
  ES --> O["User · Enter or paste six digits"]
  O --> OA["System · Automatically verify when digit 6 is entered"]
  O --> OM["User · Press Continue to verify or retry manually"]
  OA --> OV{"System · Code accepted?"}
  OM --> OV
  OV -- "No" --> OE["System · Show the error; keep Clear, resend, change email, and Continue available"]
  OE --> O
  OV -- "Yes" --> L{"System · Saved result already exists?"}
  L -- "Yes" --> LS{"System · Community tasks complete?"}
  L -- "No, completed quiz is available" --> QS["System · Submit answers and create the result"]
  L -- "No result and no complete quiz" --> Q
  QS --> U
  LS -- "Yes" --> R
  LS -- "No" --> U

  U --> T["User · Open and join SmartX on Telegram"]
  U --> X["User · Open and follow SmartX on X"]
  T --> TC["System · Record the Telegram step after the click"]
  X --> XC["System · Record the X step after the click"]
  TC --> UU{"System · Both steps recorded?"}
  XC --> UU
  UU -- "No" --> U
  UU -- "Yes" --> RA["System · Fetch the workspace and open the result"]
  UU -- "Automatic fetch fails" --> RR["User · Reveal my result as a manual fallback"]
  RA --> R
  RR --> R

  R --> S["User · Share result or download the result card"]
  S --> SB["System · Record first share and apply +10 Boost"]
  R --> I["User · Copy invite link and invite friends"]
  I --> IF["External · Friend completes a verified waitlist journey"]
  IF --> IB["System · Apply +5 Boost per verified friend and refresh rank"]
  SB --> R
  IB --> R
```

## Steps that require the user to advance

1. Choose **Start the test** or **Already tested? View my result**.
2. Answer all six questions.
3. Enter an email and press **Continue** or **Send code**.
4. Enter or paste the six-digit code. Automatic verification is the primary path; **Continue** remains the manual trigger and retry path.
5. If needed, use **Clear**, **Resend code**, or **Change email**.
6. Open Telegram and X and complete the two community actions externally.
7. If the automatic transition after the second community task fails, press **Reveal my result** as a manual fallback.
8. Optionally share or download the result, or copy the invite link.

## Steps the system performs automatically

1. Restore the saved session, quiz draft, invite, and result when the page opens.
2. Fetch the current questions and decide the correct entry stage.
3. Recognize an existing email, send the verification code, and move directly to verification.
4. Submit verification automatically when the sixth digit is entered, while preserving the manual **Continue** fallback.
5. Create or retrieve the result after sign-in and route to unlock or result.
6. After the second community task is recorded, fetch the workspace and open the result automatically.
7. Record first-share Boost, verified-friend Boost, and refresh live rank.
