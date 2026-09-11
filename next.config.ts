import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  // 图片优化第二轮再开（需要 remotePatterns 白名单），先保持与静态导出一致的行为。
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    "@privy-io/react-auth",
    "@privy-io/js-sdk-core",
    "@solana/kit",
    "@solana/web3.js",
    "@solana-program/memo",
    "@solana-program/system",
    "@solana-program/token",
  ],
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
  experimental: {
    swcPlugins: [["@lingui/swc-plugin", {}]],
  },
  webpack: (config) => {
    const extras = ["pino-pretty", "lokijs", "encoding"];
    if (Array.isArray(config.externals)) config.externals.push(...extras);
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@farcaster/mini-app-solana": false,
    };
    return config;
  },
};

export default nextConfig;
