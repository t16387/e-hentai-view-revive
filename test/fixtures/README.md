# Parser fixtures

Hand-written, sanitized HTML that reproduces only the *structure* of the
current public e-hentai.org markup (element ids, class names, attribute
shapes, href patterns) as observed in October 2026 and in the reference
parsers listed in `/REFERENCES.md` of the analysis. All ids, keys, titles,
tags and image URLs are fake placeholders (`1000001`, `aaaaaaaaaa`,
`Title 1`, `other:placeholder`, `https://thumbs.example.hath.network/...`).
No real gallery content of any kind.

`list-thumbnail-exh.html` mirrors the exhentai.org front page in thumbnail
mode with an account profile that hides tags (no `.gl6t`), shows the
torrent icon (`.gldown`) and contains an unrated gallery
(`background-position:-80px -1px`, i.e. rating 0). Structure only, fake ids
and placeholder titles, as observed live in October 2026.
