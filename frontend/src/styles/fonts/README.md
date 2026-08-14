# Self-hosted fonts

Both families are variable fonts licensed under the **SIL Open Font License 1.1**,
which permits bundling and redistribution with this application.

| File | Family | Axes | Source |
|---|---|---|---|
| `inter-latin.woff2`, `inter-latin-ext.woff2` | Inter | `wght` 400–700 | <https://fonts.google.com/specimen/Inter> |
| `archivo-latin.woff2`, `archivo-latin-ext.woff2` | Archivo | `wght` 400–700, `wdth` 62–125 | <https://fonts.google.com/specimen/Archivo> |

Inter carries body and UI text. Archivo carries display type — its width axis is
what the condensed broadcast headings ride on, via the `--display-stretch` token,
so no separate "condensed" font file is needed.

They are served from this directory rather than a CDN so the app makes no
third-party request at runtime and renders identically offline.

`@font-face` declarations live in `src/styles/fonts.css`. The `unicode-range`
values are copied from the Google Fonts CSS so the browser only downloads the
latin-ext file when a name actually needs it.

To update, re-fetch the woff2 URLs from the Google Fonts CSS API with a modern
browser User-Agent (that is what makes it serve woff2 rather than ttf) and
replace these files in place; the `unicode-range` values in `fonts.css` must be
kept in sync with whatever that CSS returns.
