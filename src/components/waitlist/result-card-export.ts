import { waitlistShareQuery } from "@/lib/waitlist/share-result";

export type RenderedResultCard = {
  href: string;
  filename: string;
  blob: Blob;
};

/**
 * 下载/复制的结果卡直接复用服务端 `/waitlist/og/` 渲染的海报，
 * 与 X 分享链接展示的卡片保持像素一致。
 */
export async function fetchResultCard(
  inviteCode: string,
  locale: string,
  result: string,
): Promise<RenderedResultCard> {
  const query = waitlistShareQuery({ invite: inviteCode, locale, result });
  query.set("t", String(Date.now()));
  const response = await fetch(`/waitlist/og/?${query.toString()}`, { cache: "no-store" });
  const contentType = response.headers.get("content-type") ?? "";
  // 卡片数据不可用时服务端会 302 到默认 OG 图；斜杠规范化造成的 redirected 仍可能是有效海报。
  const fellBackToDefaultOg = response.redirected && /opengraph-image/i.test(response.url);
  if (!response.ok || fellBackToDefaultOg || !contentType.startsWith("image/")) {
    throw new Error("Result card is not available yet.");
  }
  const blob = await response.blob();
  return {
    href: URL.createObjectURL(blob),
    filename: `smartx-${inviteCode.toLowerCase()}-1200x630`,
    blob,
  };
}
