"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { ResultDialog } from "./result-dialog";
import { fetchResultCard, type RenderedResultCard } from "./result-card-export";
import { downloadShareImage, shareFileName, type ShareImageActionResult } from "@/lib/waitlist/share-image";
import styles from "./download-dialog.module.css";

type Format = "x" | "story";
type Entry = { card?: RenderedResultCard; failed?: boolean };
export function DownloadDialog({ open, onClose, inviteCode, locale, result, onResult, onError }: {
  open: boolean; onClose: () => void; inviteCode: string; locale: string; result: string;
  onResult: (result: ShareImageActionResult, blob: Blob) => void; onError: () => void;
}) {
  useLingui();
  const [entries, setEntries] = useState<Record<Format, Entry>>({ x: {}, story: {} });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const active = useRef(false);
  useEffect(() => {
    if (!open) return;
    active.current = true;
    let cancelled = false;
    const urls: string[] = [];
    setEntries({ x: {}, story: {} });
    for (const format of ["x", "story"] as const) {
      void fetchResultCard(inviteCode, locale, result, format).then((card) => {
        if (cancelled) { URL.revokeObjectURL(card.href); return; }
        urls.push(card.href);
        setEntries((current) => ({ ...current, [format]: { card } }));
      }).catch(() => { if (!cancelled) setEntries((current) => ({ ...current, [format]: { failed: true } })); });
    }
    return () => { cancelled = true; active.current = false; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [open, inviteCode, locale, result, attempt]);
  const download = async (card: RenderedResultCard) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      // Keep the native share call in the tap event, after images have prepared.
      const action = await downloadShareImage(card.blob, shareFileName(card.filename), card.href);
      if (active.current && action !== "cancelled") { onClose(); onResult(action, card.blob); }
    } catch { if (active.current) { onClose(); onError(); } }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <ResultDialog open={open} onClose={onClose} title={t`Download result`}>
    <div className={styles.options}>
      {(["x", "story"] as const).map((format) => {
        const entry = entries[format];
        return <button key={format} type="button" className={styles.option} disabled={busy || (!entry.card && !entry.failed)}
          aria-busy={!entry.card && !entry.failed}
          onClick={() => entry.card ? void download(entry.card) : setAttempt((value) => value + 1)}>
          <Image src="/assets/waitlist/download.svg" alt="" width={20} height={20} />
          <span><strong>{format === "x" ? t`X image` : t`Story image`}</strong>
            <small>{entry.failed ? t`Couldn’t load image. Tap to retry.` : !entry.card ? t`Preparing…` : format === "x" ? t`Landscape · 1200 × 630` : t`Portrait · 1080 × 1920`}</small>
          </span>
        </button>;
      })}
    </div>
  </ResultDialog>;
}
