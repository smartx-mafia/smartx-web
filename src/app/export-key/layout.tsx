import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#060510",
};

export default function ExportKeyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
