"use client";

import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { LinguiContext } from "@lingui/react";

import { type AppLocale, i18n, LOCALE_STORAGE_KEY, toAppLocale } from "./instance";

function syncDocumentLocale(locale: AppLocale): void {
  if (typeof document === "undefined") return;

  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
}

function readStoredLocale(): AppLocale {
  try {
    return toAppLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return "en";
  }
}

function revealTranslatedDocument(): void {
  document.documentElement.removeAttribute("data-i18n-pending");
  document.getElementById("smartx-i18n-boot")?.remove();
}

export function LinguiProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>("en");
  const [ready, setReady] = useState(false);

  // 等首轮 hydration 完成后再激活浏览器保存的语言，避免 Suspense 子树
  // 在服务端英文与客户端本地语言之间产生文本不一致。
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const stored = readStoredLocale();
        if (i18n.locale !== stored) i18n.activate(stored);
        syncDocumentLocale(stored);
        setLocale(stored);
        setReady(true);

        unsubscribe = i18n.on("change", () => {
          const next = toAppLocale(i18n.locale);
          syncDocumentLocale(next);
          setLocale(next);
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      unsubscribe?.();
    };
  }, []);

  useLayoutEffect(() => {
    if (ready) revealTranslatedDocument();
  }, [ready, locale]);

  const context = useMemo(
    () => ({
      i18n,
      _: i18n.t.bind(i18n),
    }),
    // i18n 是可变单例；靠 locale 变化产出新 context 值，驱动消费组件重渲染。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  return <LinguiContext.Provider value={context}>{children}</LinguiContext.Provider>;
}
