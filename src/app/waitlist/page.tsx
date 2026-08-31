import type { Metadata } from "next";
import { Suspense } from "react";

import { WaitlistExperience } from "@/components/waitlist/waitlist-experience";
import { localeFromParam, localeSearchParam } from "@/lingui";
import { QUIZ_ART_SRCS } from "@/lib/waitlist/persona";
import { withCacheBuster } from "@/lib/waitlist/api";
import { loadInviterShareCard, requestOrigin } from "@/lib/waitlist/public-share";
import { shareOgCopy } from "@/lib/waitlist/share-copy";
import {
  SMARTX_OPEN_GRAPH_DEFAULTS,
  SMARTX_TWITTER_DEFAULTS,
} from "@/lib/site-metadata";

const DEFAULT_METADATA: Metadata = {
  title: "SmartX Waitlist | Find Your Trader Type",
  description:
    "Take the six-question SmartX trader type test, save your result, and join the invite-only waitlist.",
  alternates: { canonical: "/waitlist/" },
  robots: { index: false, follow: false },
};

type WaitlistPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: WaitlistPageProps): Promise<Metadata> {
  const params = await searchParams;
  const rawInvite = Array.isArray(params.invite) ? params.invite[0] : params.invite;
  if (!rawInvite) return DEFAULT_METADATA;

  const locale = localeFromParam(params.lang);
  const card = await loadInviterShareCard(rawInvite, locale);
  if (!card) return DEFAULT_METADATA;

  const origin = await requestOrigin();
  const copy = shareOgCopy(card.persona, locale);
  const pageQuery = new URLSearchParams({ invite: card.invite });
  const langQuery = localeSearchParam(locale);
  if (langQuery) pageQuery.set("lang", langQuery);
  const pageUrl = `${origin}/waitlist/?${pageQuery.toString()}`;
  const ogImageUrl = withCacheBuster(`${origin}/waitlist/og/?${pageQuery.toString()}`);
  const ogImage = {
    url: ogImageUrl,
    secureUrl: ogImageUrl,
    type: "image/png",
    width: 1200,
    height: 630,
    alt: copy.imageAlt,
  };

  return {
    ...DEFAULT_METADATA,
    title: copy.title,
    description: copy.description,
    // 推特按 canonical 再抓一遍；无 invite 的 /waitlist/ 会落到兜底图。
    // nofollow 也会让爬虫不去拉 og:image。
    alternates: { canonical: pageUrl },
    robots: { index: true, follow: true },
    openGraph: {
      ...SMARTX_OPEN_GRAPH_DEFAULTS,
      title: copy.title,
      description: copy.description,
      locale: locale === "zh-CN" ? "zh_CN" : locale === "ja" ? "ja_JP" : locale === "ko" ? "ko_KR" : "en_US",
      type: "website",
      url: pageUrl,
      images: [ogImage],
    },
    twitter: {
      ...SMARTX_TWITTER_DEFAULTS,
      title: copy.title,
      description: copy.description,
      images: [ogImage],
    },
  };
}

export default function WaitlistPage() {
  return (
    <>
      {QUIZ_ART_SRCS.map((src) => (
        <link key={src} rel="preload" as="image" href={src} />
      ))}
      <Suspense>
        <WaitlistExperience />
      </Suspense>
    </>
  );
}
