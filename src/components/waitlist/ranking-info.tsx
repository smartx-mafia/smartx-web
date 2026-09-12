"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import styles from "./waitlist.module.css";
import { ResultDialog } from "./result-dialog";

/** The same explanation is available with a mouse, keyboard, or touch. */
export function RankingInfo({ children }: { children: ReactNode }) {
  useLingui();
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open]);

  return (
    <div className={styles.rankingSummary}>
    <div className={styles.rankingLabel}>
      <button type="button" className={styles.rankingTitle} onClick={() => {
        if (window.matchMedia("(max-width: 750px)").matches) setSheetOpen(true);
        else setOpen((value) => !value);
      }}><Trans>Current ranking</Trans></button>
      <div
        className={styles.rankingInfo}
        ref={root}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && !root.current?.contains(document.activeElement)) setOpen(false);
        }}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      >
        <button
          type="button"
          aria-label={t`How ranking works`}
          aria-expanded={open}
          aria-describedby={open ? id : undefined}
          onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setOpen(true); }}
          onClick={() => {
            if (window.matchMedia("(max-width: 750px)").matches) { setOpen(false); setSheetOpen(true); }
            else setOpen((value) => !value);
          }}
        >
          <Image src="/assets/waitlist/result/info.svg" alt="" width={16} height={16} />
        </button>
        {open ? <div id={id} role="tooltip" className={styles.rankingTooltip}>
          <Trans>Your starting rank is based on when you connect X. Invite Boosts improve your position. Rankings are provisional and may change.</Trans>
        </div> : null}
      </div>
    </div>
    <div className={styles.rankingValue}>{children}
      <button type="button" className={styles.mobileRankTrigger} aria-label={t`How ranking works`} aria-haspopup="dialog" onClick={() => setSheetOpen(true)} />
    </div>
    <ResultDialog open={sheetOpen} onClose={() => setSheetOpen(false)} title={t`Current ranking`}>
      <p><Trans>Your starting rank is based on when you connect X. Invite Boosts improve your position. Rankings are provisional and may change.</Trans></p>
    </ResultDialog>
    </div>
  );
}
