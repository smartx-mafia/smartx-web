"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import styles from "./result-toast.module.css";

type Toast = { id: number; message: string; kind: "success" | "info" | "error" };
export function useResultToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const id = useRef(0);
  const showToast = useCallback((message: string, kind: Toast["kind"] = "success") => setToast({ id: ++id.current, message, kind }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  return { toast, showToast, dismissToast };
}

export function ResultToast({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  useLingui();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!toast) return;
    const node = ref.current;
    let hovered = false;
    let remaining = toast.kind === "error" ? 6000 : 4000;
    let started = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (timer) { clearTimeout(timer); timer = undefined; remaining -= Date.now() - started; }
      if (!hovered && !node?.contains(document.activeElement) && !document.hidden) { started = Date.now(); timer = setTimeout(onDismiss, Math.max(0, remaining)); }
    };
    const enter = (event: PointerEvent) => { if (event.pointerType === "mouse") { hovered = true; update(); } };
    const leave = () => { hovered = false; update(); };
    const blur = () => queueMicrotask(update);
    update();
    document.addEventListener("visibilitychange", update);
    node?.addEventListener("pointerenter", enter);
    node?.addEventListener("pointerleave", leave);
    node?.addEventListener("focusin", update);
    node?.addEventListener("focusout", blur);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
      node?.removeEventListener("pointerenter", enter);
      node?.removeEventListener("pointerleave", leave);
      node?.removeEventListener("focusin", update);
      node?.removeEventListener("focusout", blur);
    };
  }, [toast, onDismiss]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => ref.current?.style.setProperty("--keyboard-inset", `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight) - (viewport?.offsetTop ?? 0))}px`);
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => { viewport?.removeEventListener("resize", update); viewport?.removeEventListener("scroll", update); };
  }, [toast]);
  return <div ref={ref} className={styles.host} aria-live={toast?.kind === "error" ? "assertive" : "polite"} aria-atomic="true">
    {toast ? <div key={toast.id} className={styles.toast}>
      <Image src={toast.kind === "success" ? "/assets/waitlist/checkbox-selected.svg" : "/assets/waitlist/result/info.svg"} alt="" width={20} height={20} />
      <p>{toast.message}</p><button type="button" aria-label={t`Dismiss notification`} onClick={onDismiss}>×</button>
    </div> : null}
  </div>;
}
