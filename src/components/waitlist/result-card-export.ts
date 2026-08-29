export type RenderedResultCard = {
  href: string;
  filename: string;
  blob: Blob;
};

/**
 * 下载/复制的结果卡直接复用服务端 `/waitlist/og/` 渲染的海报，
 * 与 X 分享链接展示的卡片保持像素一致。
 */
export async function fetchResultCard(inviteCode: string): Promise<RenderedResultCard> {
  const response = await fetch(`/waitlist/og/?invite=${encodeURIComponent(inviteCode)}`);
  // 卡片数据不可用时服务端会 302 回退到默认 OG 图，此时视为失败。
  if (!response.ok || response.redirected) {
    throw new Error("Result card is not available yet.");
  }
  const blob = await response.blob();
  return {
    href: URL.createObjectURL(blob),
    filename: `smartx-${inviteCode.toLowerCase()}-1200x630`,
    blob,
  };
}
