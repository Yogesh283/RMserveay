# RM Survey — React Native (reference)

Parallel implementation sketch matching the web app’s **navy + gold + subtle violet** system. Copy into an Expo or RN CLI project and wire `@react-navigation/bottom-tabs`.

## Theme

- Background: `#0B2C4D`, panels: `#071e36`
- Primary CTA: gold gradient (`#F4D03F` → `#D4AF37`)
- Accent glow: violet at low opacity only on focused tabs / key metrics

## Files

- `src/theme.ts` — colors, spacing (8pt grid)
- `src/components/Card.tsx`, `Button.tsx`, `Input.tsx`
- `src/navigation/TabNavigator.tsx` — bottom tabs (Home, Surveys, Wallet, Team, More)

This repo folder is **not** a standalone RN app (no `metro.config.js`). Treat it as drop-in source for your mobile workspace.
