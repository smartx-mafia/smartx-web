import type { Metadata } from "next";

export const SMARTX_SITE_URL = "https://smartx.io/";
export const SMARTX_SITE_NAME = "SmartX";
export const SMARTX_ORGANIZATION_ID = `${SMARTX_SITE_URL}#org`;
export const SMARTX_WEBSITE_ID = `${SMARTX_SITE_URL}#site`;
export const SMARTX_LOGO_URL = `${SMARTX_SITE_URL}assets/smartx-logo.svg`;
export const SMARTX_TWITTER_HANDLE = "@SmartXTerminal";

/** 文件名变更用于打社交媒体预览缓存（Telegram 按 URL 缓存）。替换图时改版本号。 */
export const SMARTX_DEFAULT_SOCIAL_IMAGE_PATH = "/opengraph-image-v2.png";

export const SMARTX_DEFAULT_SOCIAL_IMAGE = {
  url: SMARTX_DEFAULT_SOCIAL_IMAGE_PATH,
  secureUrl: SMARTX_DEFAULT_SOCIAL_IMAGE_PATH,
  type: "image/png",
  width: 1200,
  height: 630,
  alt: "SmartX — The AI trading terminal that understands you",
} as const;

export const SMARTX_OPEN_GRAPH_DEFAULTS = {
  siteName: SMARTX_SITE_NAME,
  locale: "en_US",
} as const;

export const SMARTX_TWITTER_DEFAULTS = {
  card: "summary_large_image",
  site: SMARTX_TWITTER_HANDLE,
  creator: SMARTX_TWITTER_HANDLE,
} as const;

export const SMARTX_INDEXABLE_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
} satisfies NonNullable<Metadata["robots"]>;

/** Preview/测试域必须用当前部署 host，否则 Telegram 会去 smartx.io 拉图导致无图。 */
export function smartXMetadataBase() {
  const env = process.env.VERCEL_ENV;
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const branchHost = process.env.VERCEL_BRANCH_URL;
  const deploymentHost = process.env.VERCEL_URL;
  const host =
    (env === "production" ? productionHost : branchHost) || deploymentHost;
  return new URL(host ? `https://${host}` : SMARTX_SITE_URL);
}

export function resolveSmartXUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, SMARTX_SITE_URL).toString();
}
