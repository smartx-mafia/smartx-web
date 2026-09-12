"use client";

import { useSyncExternalStore } from "react";
import { WaitlistExperience } from "./waitlist-experience";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** The account-dependent UI starts after hydration. The shared locale provider
 * may activate a saved language while this Suspense boundary is still streaming;
 * rendering it then would compare translated client text with English HTML.
 * Share metadata and /waitlist/og remain server-rendered in their existing routes.
 */
export function WaitlistClientView() {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return hydrated ? <WaitlistExperience /> : <div aria-busy="true" style={{ minHeight: "100svh", background: "#000" }} />;
}
