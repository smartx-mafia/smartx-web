"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import styles from "./waitlist.module.css";

/** The same explanation is available with a mouse, keyboard, or touch. */
export function RankingInfo() {
  useLingui();
  const [open, setOpen] = useState(false);
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
    <div className={styles.rankingLabel}>
      <span><Trans>Current ranking</Trans></span>
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
          onClick={() => setOpen((value) => !value)}
        >
          <Image src="/assets/waitlist/result/info.svg" alt="" width={16} height={16} />
        </button>
        {open ? <div id={id} role="tooltip" className={styles.rankingTooltip}>
          <Trans>Your starting rank is based on when you connect X. Invite Boosts improve your position. Rankings are provisional and may change.</Trans>
        </div> : null}
      </div>
    </div>
  );
}
