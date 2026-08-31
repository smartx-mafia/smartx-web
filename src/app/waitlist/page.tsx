import type { Metadata } from "next";
import { Suspense } from "react";

import { WaitlistExperience } from "@/components/waitlist/waitlist-experience";
import { localeFromParam } from "@/lingui";
import { QUIZ_ART_SRCS } from "@/lib/waitlist/persona";
import { requestOrigin } from "@/lib/waitlist/public-share";
import { shareOgCopy } from "@/lib/waitlist/share-copy";
import { decodeShareResult, waitlistShareQuery } from "@/lib/waitlist/share-result";
import {
  SMARTX_DEFAULT_SOCIAL_IMAGE,
  SMARTX_OPEN_GRAPH_DEFAULTS,
  SMARTX_TWITTER_DEFAULTS,
} from "@/lib/site-metadata";

/** 无 result / result 无法解析时，分享预览与首页一致。 */
const FALLBACK_TITLE = "SmartX | Trade your edge";
const FALLBACK_DESCRIPTION =
  "The social trading app for memes, perps, stocks and prediction markets. Follow verified traders and copy in one tap.";

const DEFAULT_METADATA: Metadata = {
  title: FALLBACK_TITLE,
  description: FALLBACK_DESCRIPTION,
  alternates: { canonical: "/waitlist/" },
  robots: { index: true, follow: true },
  openGraph: {
    ...SMARTX_OPEN_GRAPH_DEFAULTS,
    title: FALLBACK_TITLE,
    description: FALLBACK_DESCRIPTION,
    type: "website",
    url: "/waitlist/",
    images: [SMARTX_DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    ...SMARTX_TWITTER_DEFAULTS,
    title: FALLBACK_TITLE,
    description: FALLBACK_DESCRIPTION,
    images: [SMARTX_DEFAULT_SOCIAL_IMAGE],
  },
};

type WaitlistPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  searchParams,
}: WaitlistPageProps): Promise<Metadata> {
  const params = await searchParams;
  const rawResult = firstSearchParam(params.result);
  const parsed = decodeShareResult(rawResult);
  if (!parsed || !rawResult) return DEFAULT_METADATA;

  const locale = localeFromParam(params.lang);
  const origin = await requestOrigin();
  const copy = shareOgCopy(parsed.persona, locale);
  const pageQuery = waitlistShareQuery({
    invite: firstSearchParam(params.invite),
    result: rawResult.trim(),
    locale,
  });
  const pageUrl = `${origin}/waitlist/?${pageQuery.toString()}`;
  const ogImageUrl = `${origin}/waitlist/og/?${pageQuery.toString()}`;
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
    // 推特按 canonical 再抓一遍；无 result 时走首页文案 + 兜底图。
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
