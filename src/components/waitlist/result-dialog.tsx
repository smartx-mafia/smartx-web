"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import styles from "./result-dialog.module.css";

/** A native modal on desktop, a safe-area/keyboard-aware sheet on mobile. */
export function ResultDialog({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  useLingui();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    const resize = () => {
      dialog.style.setProperty("--visible-height", `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty("--keyboard-inset", `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight) - (viewport?.offsetTop ?? 0))}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      dialog.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    } }}>
    <div className={styles.content}>
      <header><h2 id={titleId}>{title}</h2><button type="button" className={styles.close} aria-label={t`Close`} onClick={onClose}>×</button></header>
      {children}
    </div>
  </dialog>;
}
