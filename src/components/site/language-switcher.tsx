"use client";

import { useEffect, useRef, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";

import {
  APP_LOCALES,
  LOCALE_LABELS,
  setAppLocale,
  toAppLocale,
} from "@/lingui";

import styles from "./language-switcher.module.css";

function LanguageIcon() {
  return (
    <svg
      className={styles.languageIcon}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M1.9 8h12.2M8 1.75c1.65 1.7 2.55 3.77 2.55 6.25S9.65 12.55 8 14.25C6.35 12.55 5.45 10.48 5.45 8S6.35 3.45 8 1.75Z" />
    </svg>
  );
}

type LanguageSwitcherProps = {
  /** menu：按钮 + 浮层（桌面 header）；inline：一排选项（移动端导航内） */
  variant?: "menu" | "inline";
};

export function LanguageSwitcher({ variant = "menu" }: LanguageSwitcherProps) {
  const { i18n } = useLingui();
  const locale = toAppLocale(i18n.locale);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (variant === "inline") {
    return (
      <div className={styles.inline} role="group" aria-label={t`Language`}>
        {APP_LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            className={styles.inlineOption}
            data-active={code === locale ? "true" : "false"}
            aria-pressed={code === locale}
            onClick={() => setAppLocale(code)}
          >
            {LOCALE_LABELS[code]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={`${t`Language`}: ${LOCALE_LABELS[locale]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <LanguageIcon />
        <span>{LOCALE_LABELS[locale]}</span>
      </button>
      {open ? (
        <ul className={styles.menu} role="listbox" aria-label={t`Language`}>
          {APP_LOCALES.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={code === locale}
                className={styles.option}
                data-active={code === locale ? "true" : "false"}
                onClick={() => {
                  setAppLocale(code);
                  setOpen(false);
                }}
              >
                {LOCALE_LABELS[code]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
