# Design System — Ring&Rise Daily Dashboard

## 1. Visual Philosophy & Mode
- **Surface Mode**: `Operate` — high-clarity, fast-scanning real-time performance workspace inspired by Stripe Dashboard & Mercury light-mode precision.
- **Color Strategy**: Restrained cool-slate canvas (`#F6F9FC`) with crisp white surfaces (`#FFFFFF`), 1px hairline borders (`#E3E8EE`), deep navy ink (`#0A2540`), and one committed brand cobalt accent (`#0077B6`) sampled from `logo.png`.

## 2. Color Tokens
- **Primary Brand Cobalt**: `#0077B6` (`--primary: 201 100% 36%`)
- **Primary Hover / Press**: `#005A8D`
- **Primary Soft Tint**: `rgba(0, 119, 182, 0.08)`
- **Canvas Background**: `#F6F9FC` (`--background: 210 43% 98%`)
- **Elevated Surface**: `#FFFFFF` (`--card: 0 0% 100%`)
- **Hairline Border**: `#E3E8EE` (`--border: 213 24% 91%`)
- **Primary Ink**: `#0A2540` (`--foreground: 209 73% 15%`)
- **Secondary Ink**: `#425466`
- **Muted Ink**: `#64748B`
- **Success Emerald**: `#059669` (surface `#ECFDF5`, border `#A7F3D0`)
- **Podium Accents**:
  - 1st Gold: `#D97706` / `#FFFBEB`
  - 2nd Silver: `#64748B` / `#F8FAFC`
  - 3rd Bronze: `#B45309` / `#FFF7ED`

## 3. Typography
- **UI Sans**: `Inter`, system sans-serif stack (`-apple-system`, `BlinkMacSystemFont`, sans-serif)
- **Monospace**: `JetBrains Mono` for timestamps, dates, and usernames
- **Numeric Discipline**: `font-variant-numeric: tabular-nums` enforced on all lead counts, ranks, targets, and percentages.
- **No decorative kickers/eyebrows** above headings; hierarchy comes from weight, scale, and hairline separation.

## 4. Layout & Surface Rules
- **Header**: Top bar (`64px`, `#FFFFFF`, `1px` bottom hairline) with `logo.png` wordmark + `"Daily Dashboard"` title on the left and a single navigation/account dropdown on the right.
- **Dashboard Split**:
  - Unified 3-column daily performance strip (`My Leads Today`, `Daily Ranking`, `Team Daily Progress`).
  - Left column (`60%` desktop width): Daily Leaderboard (Top 3 crowns + ranked list) & Live Activity Feed.
  - Right column (`30%` desktop width): Campaign Target Progress cards.
  - Floating bottom-center primary CTA (`ANNOUNCE LEAD`) with cobalt elevation.
- **Shadows**: Soft offset elevation (`0 1px 2px rgba(10,37,64,0.04), 0 4px 12px rgba(10,37,64,0.03)`), never zero-blur block shadows or decorative glass blur.
