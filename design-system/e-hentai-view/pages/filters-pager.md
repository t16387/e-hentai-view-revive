# Filters Pager Page Overrides

> **PROJECT:** e-hentai-view
> **Generated:** 2026-10-12 00:20:53
> **Page Type:** Blog / Article

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content

### Spacing Overrides

- Control rhythm (Swiss): chips, Edit filters, and pager jump share `V4.control.height` (44px), `radius` 8, `gap` 8 — see `src/design/v4Tokens.ts`
- Category row: wrap with equal-height pills; selected = purple border + soft glow; unselected = dim + desaturate (no layout shift)
- Pager: one surface containing nav strip + jump row (8px gap); nav buttons 48px


### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- No overrides — use Master colors

### Component Overrides

- Avoid: Force all chips into one clipped row or hide overflow values
- Avoid: Div soup with no semantics
- Avoid: Large blocking CSS files
- Avoid: Filled primary “chip-like” Edit button that fights category color pills — use outlined / tinted control at the same height
- Avoid: Nested pager chrome (strip card inside another card) with mismatched control heights


---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Minimal glow (text-shadow: 0 0 10px), dark-to-light transitions, low white emission, high readability, visible focus
- Layout: Wrap the collection or use an operable +n disclosure for hidden overflow values
- Accessibility: Use semantic HTML and ARIA properly
- Performance: Inline critical CSS defer non-critical
