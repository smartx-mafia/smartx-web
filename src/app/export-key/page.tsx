import type { Metadata } from "next";
import { Suspense } from "react";

import { ExportKeyExperience } from "@/components/export-key/export-key-experience";

export const metadata: Metadata = {
  title: "Export key | smartX",
  description: "Export your smartX wallet private key.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: "/export-key/" },
};

function ExportKeyFallback() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: "28px 20px",
        background: "#060510",
        color: "#9899A3",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Loading…
    </main>
  );
}

export default function ExportKeyPage() {
  return (
    <Suspense fallback={<ExportKeyFallback />}>
      <ExportKeyExperience />
    </Suspense>
  );
}
