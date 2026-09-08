import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/export-key/", "/export-key"],
    },
    sitemap: "https://smartx.io/sitemap.xml",
    host: "https://smartx.io",
  };
}
