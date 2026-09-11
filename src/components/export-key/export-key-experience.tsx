"use client";

import "./buffer-polyfill";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PrivyProvider, useLogin, usePrivy } from "@privy-io/react-auth";
import { useExportWallet as useExportSolanaWallet } from "@privy-io/react-auth/solana";

import { PRIVY_APP_ID } from "@/lib/export-key/config";
import { setAppLocale, toAppLocale } from "@/lingui";
import { LanguageSwitcher } from "@/components/site/language-switcher";

import styles from "./export-key.module.css";

type LoginMethod = "google" | "apple" | "twitter" | string | null;

type LinkedAccount = {
  type: string;
  email?: string | null;
  name?: string | null;
  address?: string;
  walletClientType?: string;
  chainType?: string;
};

type PrivyUserLike = {
  email?: { address?: string } | null;
  google?: { email?: string | null; name?: string | null } | null;
  apple?: { email?: string | null } | null;
  linkedAccounts?: LinkedAccount[];
} | null;

const PRIVY_CONFIG = {
  appearance: {
    theme: "dark" as const,
    accentColor: "#08DFB5" as const,
    logo: "/assets/consumer-network/logo-white.svg",
  },
  loginMethods: ["google", "apple", "email"] as Array<"google" | "apple" | "email">,
  loginMethodsAndOrder: {
    primary: ["google", "apple", "email"] as ["google", "apple", "email"],
  },
  embeddedWallets: {
    ethereum: { createOnLogin: "off" as const },
    solana: { createOnLogin: "off" as const },
  },
};

function firstParam(value: string | null) {
  const next = value?.trim() ?? "";
  return next || null;
}

function isPrivyEmbedded(account: LinkedAccount): account is LinkedAccount & {
  address: string;
  chainType: "solana" | "ethereum";
} {
  return (
    account.type === "wallet" &&
    (account.walletClientType === "privy" || account.walletClientType === "privy-v2") &&
    Boolean(account.address) &&
    (account.chainType === "solana" || account.chainType === "ethereum")
  );
}

function loginMethodFromUser(user: PrivyUserLike): LoginMethod {
  const oauth = user?.linkedAccounts?.find(
    (account) => typeof account.type === "string" && account.type.includes("oauth"),
  );
  if (!oauth) return user?.email?.address ? "email" : null;
  if (oauth.type === "apple_oauth") return "apple";
  if (oauth.type === "google_oauth") return "google";
  if (oauth.type === "twitter_oauth") return "twitter";
  return oauth.type.replace("_oauth", "");
}

function emailFromUser(user: PrivyUserLike): string | null {
  if (user?.email?.address) return user.email.address;
  if (user?.google?.email) return user.google.email;
  if (user?.apple?.email) return user.apple.email;
  for (const account of user?.linkedAccounts ?? []) {
    if (typeof account.type === "string" && account.type.includes("oauth") && account.email) {
      return account.email;
    }
  }
  return null;
}

function displayNameFromUser(user: PrivyUserLike, email: string | null): string {
  const googleName = user?.google?.name?.trim();
  if (googleName) return googleName;
  const named = user?.linkedAccounts?.find((account) => account.name?.trim())?.name?.trim();
  if (named) return named;
  if (email) return email.split("@")[0] || "User";
  return "User";
}

function addressFromUser(user: PrivyUserLike, chain: "solana" | "ethereum"): string | null {
  for (const account of user?.linkedAccounts ?? []) {
    if (!isPrivyEmbedded(account)) continue;
    if (account.chainType === chain) return account.address;
  }
  return null;
}

function GoogleMark() {
  return (
    <svg className={styles.loginMark} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A8.1 8.1 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A4.87 4.87 0 0 1 3.72 9c0-.6.1-1.17.25-1.71V4.96H.96A8.1 8.1 0 0 0 .1 9c0 1.31.3 2.55.86 3.67l3.01-1.96Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.1 8.1 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg className={styles.loginMark} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.86 9.48c-.02-2.16 1.76-3.2 1.84-3.25-1-1.47-2.57-1.67-3.12-1.7-1.33-.13-2.6.78-3.27.78-.68 0-1.72-.76-2.83-.74-1.46.02-2.8.85-3.55 2.15-1.52 2.63-.39 6.53 1.09 8.67.72 1.04 1.59 2.22 2.72 2.18 1.1-.05 1.51-.7 2.84-.7 1.32 0 1.69.7 2.84.68 1.18-.02 1.92-1.06 2.64-2.11.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.28-.87-2.3-3.52ZM11.7 3.3c.6-.73 1-1.74.89-2.75-.86.03-1.9.57-2.52 1.3-.55.64-1.04 1.67-.91 2.65.96.07 1.94-.49 2.54-1.2Z"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className={styles.warningIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className={styles.closeIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function Spinner() {
  return <div className={styles.spinner} aria-hidden="true" />;
}

function UserCard({
  displayName,
  email,
  loginMethod,
}: {
  displayName: string;
  email: string | null;
  loginMethod: LoginMethod;
}) {
  const initial = (displayName.trim()[0] || "U").toUpperCase();
  return (
    <div className={styles.userCard}>
      <div className={styles.avatar} aria-hidden="true">
        {initial}
      </div>
      <div className={styles.userMeta}>
        <div className={styles.userName}>{displayName}</div>
        {email ? (
          <div className={styles.userEmail}>
            {loginMethod === "google" ? <GoogleMark /> : null}
            {loginMethod === "apple" ? <AppleMark /> : null}
            <span>{email}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WarningStep({ onContinue }: { onContinue: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className={styles.dialogBody}>
      <div className={styles.warningHead}>
        <WarningIcon />
        <p className={styles.warningTitle}>
          <Trans>Read carefully before exporting keys</Trans>
        </p>
      </div>
      <div className={styles.warningListWrap}>
        <ul className={styles.warningList}>
          <li>
            <Trans>
              Your private key is an unchangeable password for your account. If someone gets access, they can steal all of your funds.
            </Trans>
          </li>
          <li>
            <Trans>The smartX team will never ask you for your private key.</Trans>
          </li>
          <li>
            <Trans>
              smartX does not support tracking your activity on other platforms. Your trades and portfolio may become inaccurate and you may be removed from the leaderboard.
            </Trans>
          </li>
        </ul>
      </div>
      <div
        role="checkbox"
        aria-checked={acknowledged}
        tabIndex={0}
        className={styles.acknowledge}
        onClick={() => setAcknowledged((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            setAcknowledged((current) => !current);
          }
        }}
      >
        <span className={styles.checkbox} data-checked={acknowledged ? "true" : "false"} />
        <span className={styles.acknowledgeCopy}>
          <strong>
            <Trans>I acknowledge the risks</Trans>
          </strong>
          <span>
            <Trans>
              I understand that sharing my private key could result in a permanent loss of funds.
            </Trans>
          </span>
        </span>
      </div>
      <button
        type="button"
        className={styles.continue}
        disabled={!acknowledged}
        onClick={onContinue}
      >
        <Trans>Continue</Trans>
      </button>
    </div>
  );
}

function ExportDialog({
  open,
  onOpenChange,
  onExportEvm,
  onExportSolana,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportEvm: () => void;
  onExportSolana: () => void;
}) {
  const titleId = useId();
  const [readyToExport, setReadyToExport] = useState(false);

  useEffect(() => {
    if (!open) {
      setReadyToExport(false);
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className={styles.dialogRoot}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label={t`Close`}
        onClick={() => onOpenChange(false)}
      />
      <div className={styles.dialogStack}>
        <button
          type="button"
          className={styles.close}
          aria-label={t`Close`}
          onClick={() => onOpenChange(false)}
        >
          <CloseIcon />
        </button>
        <div
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {readyToExport ? (
            <div className={styles.dialogBody}>
              <h2 id={titleId} className={styles.dialogTitle}>
                <Trans>Export keys</Trans>
              </h2>
              <button type="button" className={styles.secondary} onClick={onExportEvm}>
                <Trans>Export EVM wallet</Trans>
              </button>
              <button type="button" className={styles.secondary} onClick={onExportSolana}>
                <Trans>Export Solana wallet</Trans>
              </button>
            </div>
          ) : (
            <>
              <h2 id={titleId} className={styles.srOnly}>
                <Trans>Export keys</Trans>
              </h2>
              <WarningStep onContinue={() => setReadyToExport(true)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ExportFlow() {
  useLingui();
  const searchParams = useSearchParams();
  const { ready, authenticated, user, logout, exportWallet: exportEvm } = usePrivy();
  const { login } = useLogin();
  const { exportWallet: exportSolana } = useExportSolanaWallet();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const lang = firstParam(searchParams.get("lang"));
    if (lang) setAppLocale(toAppLocale(lang));
  }, [searchParams]);

  const privyUser = user as PrivyUserLike;
  const email = emailFromUser(privyUser);
  const loginMethod = loginMethodFromUser(privyUser);
  const displayName = displayNameFromUser(privyUser, email);
  const evmAddress = firstParam(searchParams.get("evm")) ?? addressFromUser(privyUser, "ethereum");
  const solanaAddress = firstParam(searchParams.get("solana")) ?? addressFromUser(privyUser, "solana");

  const loading = !ready;

  const exportEvmWallet = useMemo(
    () => () => {
      void (evmAddress ? exportEvm({ address: evmAddress }) : exportEvm());
    },
    [exportEvm, evmAddress],
  );

  const exportSolanaWallet = useMemo(
    () => () => {
      void (solanaAddress ? exportSolana({ address: solanaAddress }) : exportSolana());
    },
    [exportSolana, solanaAddress],
  );

  return (
    <>
      <div className={styles.column}>
        {loading ? (
          <div className={styles.spinnerWrap}>
            <Spinner />
          </div>
        ) : (
          <>
            <h1 className={styles.title}>
              {authenticated ? (
                <Trans>
                  smartX will <span className={styles.never}>never ask</span> for your private key
                </Trans>
              ) : (
                <Trans>Sign in to export your private key</Trans>
              )}
            </h1>
            {authenticated ? (
              <UserCard displayName={displayName} email={email} loginMethod={loginMethod} />
            ) : null}
            <div className={styles.actions}>
              {authenticated ? (
                <>
                  <button
                    type="button"
                    className={styles.export}
                    onClick={() => setDialogOpen(true)}
                  >
                    <Trans>Export key</Trans>
                  </button>
                  <button
                    type="button"
                    className={styles.signOut}
                    onClick={() => {
                      void logout();
                    }}
                  >
                    <Trans>Sign out</Trans>
                  </button>
                </>
              ) : (
                <button type="button" className={styles.login} onClick={() => login()}>
                  <Trans>Login</Trans>
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <ExportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onExportEvm={exportEvmWallet}
        onExportSolana={exportSolanaWallet}
      />
    </>
  );
}

export function ExportKeyExperience() {
  useLingui();

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.brand} aria-label="SmartX">
          <Image
            src="/assets/consumer-network/logo-white.svg"
            alt=""
            width={34}
            height={28}
            priority
          />
          <span>SmartX</span>
        </div>
        <LanguageSwitcher alwaysVisible />
      </div>
      {PRIVY_APP_ID ? (
        <PrivyProvider appId={PRIVY_APP_ID} config={PRIVY_CONFIG}>
          <ExportFlow />
        </PrivyProvider>
      ) : (
        <div className={styles.column}>
          <p className={styles.missing}>
            <Trans>Missing Privy app configuration.</Trans>
          </p>
        </div>
      )}
    </main>
  );
}
