/** 与 smartx-app 的 EXPO_PUBLIC_PRIVY_APP_ID 相同；可用 NEXT_PUBLIC_PRIVY_APP_ID 覆盖。 */
export const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmtb1g7g800l10dkzdlqi80zm";

/** 可选；不设则走 Privy 默认 web client。 */
export const PRIVY_CLIENT_ID = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || "";
