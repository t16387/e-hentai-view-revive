/**
 * UI V4 tokens — Cyberpunk palette tempered with Minimal/Swiss discipline.
 * Source: design-system/e-hentai-view/MASTER.md (+ filters-pager overrides).
 * Keep neon/glitch effects off controls; prefer clear hierarchy and ≥44px targets.
 */

export const V4 = {
  primary: '#8B5CF6',
  primaryMuted: '#A78BFA',
  onPrimary: '#0F0F23',
  accent: '#FBBF24',
  onAccent: '#0F172A',
  background: '#0F0F23',
  foreground: '#F8FAFC',
  card: '#1E1D35',
  cardForeground: '#F8FAFC',
  muted: '#27273B',
  mutedForeground: '#94A3B8',
  border: '#4C1D95',
  ring: '#8B5CF6',
  destructive: '#EF4444',
  /** Shared control metrics — keep pills, Edit, pager nav at one rhythm. */
  control: {
    height: 44,
    heightNav: 48,
    radius: 8,
    gap: 8,
    padX: 12,
  },
  /** Light-mode adaptations (still purple/gold accent, not teal). */
  light: {
    primary: '#7C3AED',
    background: '#FAFAFC',
    card: '#FFFFFF',
    foreground: '#0F172A',
    muted: '#F1F5F9',
    mutedForeground: '#64748B',
    border: '#DDD6FE',
    ring: '#7C3AED',
  },
} as const

export type V4Tokens = typeof V4
