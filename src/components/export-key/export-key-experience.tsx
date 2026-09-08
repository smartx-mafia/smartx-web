"use client";

import "./buffer-polyfill";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PrivyProvider, useLogin, usePrivy } from "@privy-io/react-auth";
import { useExportWallet as useExportSolanaWallet } from "@privy-io/react-auth/solana";

import { PRIVY_APP_ID } from "@/lib/export-key/config";
import { setAppLocale, toAppLocale } from "@/lingui";
import { LanguageSwitcher } from "@/components/site/language-switcher";

import styles from "./export-key.module.css";

type ChainKind = "solana" | "evm";

type ExportableWallet = {
  chain: ChainKind;
  label: string;
  address: string;
};

const PRIVY_CONFIG = {
  appearance: {
    theme: "dark" as const,
    accentColor: "#08DFB5" as const,
    logo: "/assets/consumer-network/logo-white.svg",
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

function isPrivyEmbedded(account: {
  type: string;
  walletClientType?: string;
  chainType?: string;
  address?: string;
}): account is { type: "wallet"; walletClientType: string; chainType: string; address: string } {
  return (
    account.type === "wallet" &&
    (account.walletClientType === "privy" || account.walletClientType === "privy-v2") &&
    Boolean(account.address) &&
    (account.chainType === "solana" || account.chainType === "ethereum")
  );
}

function walletsFromQuery(solana: string | null, evm: string | null): ExportableWallet[] {
  const wallets: ExportableWallet[] = [];
  if (solana) wallets.push({ chain: "solana", label: "Solana", address: solana });
  if (evm) wallets.push({ chain: "evm", label: "EVM (Base)", address: evm });
  return wallets;
}

function walletsFromUser(linkedAccounts: Array<{
  type: string;
  walletClientType?: string;
  chainType?: string;
  address?: string;
}>): ExportableWallet[] {
  const wallets: ExportableWallet[] = [];
  const seen = new Set<string>();
  for (const account of linkedAccounts) {
    if (!isPrivyEmbedded(account)) continue;
    const chain: ChainKind = account.chainType === "solana" ? "solana" : "evm";
    const key = `${chain}:${account.address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    wallets.push({
      chain,
      label: chain === "solana" ? "Solana" : "EVM (Base)",
      address: account.address,
    });
  }
  return wallets;
}

function ExportKeyNav() {
  useLingui();
  return (
    <nav className={styles.nav} aria-label={t`Site navigation`}>
      <div className={styles.brand}>
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
    </nav>
  );
}

function ExportFlow() {
  useLingui();
  const searchParams = useSearchParams();
  const { ready, authenticated, user, logout, exportWallet: exportEvm } = usePrivy();
  const { login } = useLogin();
  const { exportWallet: exportSolana } = useExportSolanaWallet();
  const [busyAddress, setBusyAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const lang = firstParam(searchParams.get("lang"));
    if (lang) setAppLocale(toAppLocale(lang));
  }, [searchParams]);

  const wallets = useMemo(() => {
    const fromQuery = walletsFromQuery(
      firstParam(searchParams.get("solana")),
      firstParam(searchParams.get("evm")),
    );
    if (fromQuery.length) return fromQuery;
    return walletsFromUser(user?.linkedAccounts ?? []);
  }, [searchParams, user?.linkedAccounts]);

  const onExport = async (wallet: ExportableWallet) => {
    if (busyAddress) return;
    setError(null);
    setBusyAddress(wallet.address);
    const exportFn = wallet.chain === "solana" ? exportSolana : exportEvm;
    try {
      await exportFn({ address: wallet.address });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t`Export failed`;
      if (!/cancel|closed|dismiss/i.test(message)) setError(message);
    } finally {
      setBusyAddress(null);
    }
  };

  if (!ready) {
    return (
      <div className={styles.shell}>
        <p className={styles.copy}><Trans>Loading…</Trans></p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className={styles.shell}>
        <h1 className={styles.title}><Trans>Export private key</Trans></h1>
        <p className={styles.copy}>
          <Trans>
            Sign in with the same SmartX account. Your private key is assembled in this browser and never sent to our servers.
          </Trans>
        </p>
        <button type="button" className={styles.button} onClick={() => login()}>
          <Trans>Log in</Trans>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <h1 className={styles.title}><Trans>Export private key</Trans></h1>
      <p className={styles.warning}>
        <Trans>Never share your private key with anyone. Anyone with it can take your funds.</Trans>
      </p>
      <p className={styles.copy}>
        <Trans>Tap a wallet to open the Privy export sheet.</Trans>
      </p>
      {wallets.map((wallet) => {
        const busy = busyAddress === wallet.address;
        const otherBusy = Boolean(busyAddress) && !busy;
        return (
          <button
            key={`${wallet.chain}-${wallet.address}`}
            type="button"
            className={styles.card}
            disabled={Boolean(busyAddress)}
            data-busy={otherBusy ? "other" : busy ? "self" : undefined}
            onClick={() => {
              void onExport(wallet);
            }}
          >
            <strong>{wallet.label}</strong>
            <span className={styles.address}>{wallet.address}</span>
            <span className={styles.button}>
              {busy
                ? t`Opening Privy…`
                : wallet.chain === "solana"
                  ? t`Export Solana`
                  : t`Export EVM (Base)`}
            </span>
          </button>
        );
      })}
      {wallets.length === 0 ? (
        <p className={styles.copy}><Trans>No embedded wallet found on this account.</Trans></p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <button
        type="button"
        className={styles.ghost}
        onClick={() => {
          void logout();
        }}
      >
        <Trans>Use a different account</Trans>
      </button>
    </div>
  );
}

export function ExportKeyExperience() {
  useLingui();

  if (!PRIVY_APP_ID) {
    return (
      <main className={styles.page}>
        <ExportKeyNav />
        <div className={styles.stage}>
          <p className={styles.copy}><Trans>Missing Privy app configuration.</Trans></p>
        </div>
      </main>
    );
  }

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={PRIVY_CONFIG}>
      <main className={styles.page}>
        <ExportKeyNav />
        <div className={styles.stage}>
          <ExportFlow />
        </div>
      </main>
    </PrivyProvider>
  );
}
