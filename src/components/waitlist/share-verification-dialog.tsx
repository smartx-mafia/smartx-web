"use client";

import { useRef, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { parseXPostUrl, type ShareVerification } from "@/lib/waitlist/share-verification";
import { isWaitlistApiError } from "@/lib/waitlist/types";
import styles from "./share-verification-dialog.module.css";
import { ResultDialog } from "./result-dialog";

function errorCopy(reason: string) {
  switch (reason) {
    case "INVALID_POST_URL": return t`Enter a valid X post link, not a profile link.`;
    case "X_ACCOUNT_ALREADY_BOUND": return t`This X account is already connected to another SmartX account. Use a different X account.`;
    case "INVITE_LINK_MISMATCH": return t`This post doesn’t include your invite link. Publish a post with your own link and try again.`;
    case "POST_NOT_FOUND": return t`We couldn’t find this post. Check the link, or try again in a moment if you just posted.`;
    case "POST_NOT_PUBLIC": return t`Your post needs to be public so we can verify it.`;
    case "POST_ALREADY_USED": return t`This post has already been used for verification.`;
    case "RATE_LIMITED": return t`Too many attempts. Please wait a moment and try again.`;
    case "SHARE_VERIFICATION_UNAVAILABLE": return t`Post verification isn’t available yet. You can still share your result and return later to verify.`;
    default: return t`We couldn’t verify your post. Please try again.`;
  }
}

export function ShareVerificationDialog({ open, onClose, verification, onSubmit, onShare }: {
  open: boolean;
  onClose: () => void;
  verification: ShareVerification;
  onSubmit: (postUrl: string) => Promise<void>;
  onShare: () => void;
}) {
  useLingui();
  const inFlight = useRef(false);
  const [postUrl, setPostUrl] = useState(verification.postUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showServerError, setShowServerError] = useState(true);
  const parsed = parseXPostUrl(postUrl);
  const pending = verification.status === "pending";
  const verified = verification.status === "verified";
  const reason = error || (showServerError && verification.status === "rejected" ? verification.reason || "REJECTED" : "");

  const submit = async () => {
    if (inFlight.current || pending || verified) return;
    if (!parsed) { setError("INVALID_POST_URL"); return; }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setShowServerError(true);
    try {
      await onSubmit(parsed.url);
    } catch (error) {
      setError(isWaitlistApiError(error) ? error.code === 429 ? "RATE_LIMITED" : error.message : "FAILED");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return <ResultDialog open={open && !verified} onClose={onClose} title={pending ? t`We’re checking your post` : t`Unlock your rank`}>
    <div className={styles.content}>
      {pending ? <div className={styles.outcome} role="status">
        <p><Trans>Your rank will appear when verification is complete.</Trans></p>
        <button className={styles.primary} type="button" onClick={onClose}><Trans>Back to my result</Trans></button>
      </div> : <form onSubmit={(event) => { event.preventDefault(); void submit(); }} noValidate>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepNumber} aria-hidden="true">1</span>
            <button type="button" className={styles.shareStep} onClick={onShare}><Trans>Post on X with your invite link</Trans><span aria-hidden="true"> ↗</span></button>
          </li>
          <li>
            <span className={styles.stepNumber} aria-hidden="true">2</span>
            <div><strong><Trans>Copy your post link</Trans></strong></div>
          </li>
          <li className={styles.inputStep}>
            <span className={styles.stepNumber} aria-hidden="true">3</span>
              <label htmlFor="share-post-url"><Trans>Paste it below</Trans></label>
              <input id="share-post-url" type="url" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false}
                placeholder="https://x.com/username/status/…" value={postUrl} maxLength={2048} disabled={busy}
                aria-invalid={Boolean(reason)} aria-describedby={reason ? "share-post-error" : undefined}
                onChange={(event) => { setPostUrl(event.target.value); setError(""); setShowServerError(false); }}
                onBlur={() => { if (postUrl.trim() && !parsed) setError("INVALID_POST_URL"); }} />
          </li>
        </ol>
        {reason ? <p className={styles.error} id="share-post-error" role="alert">{errorCopy(reason)}</p> : null}
        <button className={styles.primary} type="submit" disabled={!parsed || busy} aria-busy={busy}>{busy ? t`Checking your post…` : t`Verify post`}</button>
      </form>}
    </div>
  </ResultDialog>;
}
