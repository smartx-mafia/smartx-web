# smartx-web

SmartX public website built with Next.js 15, React 19, TypeScript, and Lingui.

## Latest update — Waitlist UI refresh

The waitlist flow now follows the latest SmartX Figma direction from quiz entry through the final result screen.

- Replaced the six quiz illustrations and the verification/unlock artwork with the new SmartX owl WebP assets.
- Reworked the result page into a centered, responsive two-column layout while preserving the signed-in email and live waitlist information.
- Kept persona artwork, persona details, rank, verified-friend count, and invite code driven by backend responses; the result image includes a loading/error placeholder.
- Added single-line adaptive sizing for persona titles and aligned the persona quote mark with the approved design.
- Reduced the visual weight of Best match and Natural rival so the persona explanation remains the primary supporting copy.
- Simplified Invite friends to one backend-derived invitation link and removed the duplicate invite-code block and redundant helper copy.
- Added responsive result layouts for desktop, tablet, and mobile and refreshed all Lingui catalogs for the new copy.

## Local development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
