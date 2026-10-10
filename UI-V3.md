# UI V3 — Filter Deck, multi-tag, history preference, viewfinder pager

Date: 2026-10-11 (HK). Branch `revive`. Seed for pager creative direction: **`e-hentai-view v3`** (product name + version; Baber’s message left the seed string empty). No adult titles/thumbs in this doc. Live checks: public chrome only, ≥2s spacing when used.

## 1. Search / filter chrome (Filter Deck)

**Problem:** Ten category options + “Edit filters” did not scale across phone / tablet / desktop (cramped chips, tiny tap targets, advanced buried in a plain collapse).

**Direction (unique, not a MUI / old-site clone):**
- **Deck grid** on `/search`: category tiles in a CSS grid — **2 columns on phone**, **5 on ≥sm** (two rows of five). Each tile ≥**44px** tall, rounded, primary inset ring when on, greyscale when off. All / None as pill buttons.
- **Advanced:** on small screens a **bottom sheet** (`Drawer` anchor=bottom) with bare fields; on ≥sm an inline collapse (previous behaviour, larger toggle hit area).
- **Sticky Apply bar** fixed to the viewport bottom (blur + safe-area), Clear + Apply; fluid content `maxWidth` ~720–960.
- **Index / result:** compact wrapping chips (≥44px on phone) + tinted **filter rail** for advanced summary chips and Edit / Clear.

## 2. Multi-tag search from gallery detail

- Tag chips **toggle selection** (visual selected state + check icon); they do **not** navigate on click.
- Sticky **Clear** + **Search selected tags (N)** appear when `N > 0`.
- Confirm navigates with `f_search` = space-joined `ns:"tag$"` via `composeSelectedTags` / `searchHref`.
- Prefer select+confirm (Baber); single-click-to-search removed.

## 3. Setting: do not store history

| Item | Value |
|------|-------|
| UI | Settings → Advanced → **Do not store history** |
| Key | `localStorage` **`doNotStoreHistory`** (`'true'` / `'false'`) |
| Constant | `LOCAL_DO_NOT_STORE_HISTORY` |
| When on | Skips writes to **browse** (`galleryHistory` / Histories) and **read position** (`comic_read_page_histories`) |
| Existing data | Left in place until the user clears it |
| Not gated | Search-box query history (`search_histories`) — different from Histories |

Helpers: `readDoNotStoreHistory` / `writeDoNotStoreHistory` in `src/utils/historyPrefs.ts`.

## 4. Pager creative direction (`e-hentai-view v3`)

Subpatterns used:

| Token | Design cue |
|-------|------------|
| **e** | Emerald / teal (`#0D7377` / `#14A3A8`) circular prev/next discs |
| **h** | Horizon amber (`#E8A838`) **GO** jump CTA, dark text for contrast |
| **view** | Viewfinder “lens” frame around the page label (small `view` caption) |
| **v3** | Three-zone strip: prev \| lens \| next; 14px radii; monospace page digits |

Semantics unchanged: cursor prev/next, jump walks ≤ `LIST_JUMP_MAX_WALK` (50). `data-pager="ehv-v3"` for tests/hooks. Light/dark aware.

## 5. Product limits (unchanged / noted)

- Site has no true `page=N`; jump is cursor walk capped at 50.
- Date `seek` / `jump=Nd` still not exposed in UI.
- File Search upload still out of scope.
- Watched filter chrome still not wired (params work server-side).
- No adult content in docs/fixtures/screenshots.

## 6. Verify

```bash
cd /workspace/e-hentai-view
pnpm test && pnpm build
# /search — deck + sheet + sticky Apply
# gallery detail — select ≥2 tags → Search selected
# Settings → Advanced → Do not store history
# list pager — teal discs + amber GO
```
