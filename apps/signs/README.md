# Runopis — Valheim Sign Editor

Multilingual rich text editor with live preview for Valheim wooden signs.
Colors, font styling, offsets, symbols, presets, manual markup, and copying to game.

Runopis is a section of **Valheim Companion** hosted under `/signs/`.

## Building

The site is built from the repository root:

```sh
npm run build
```

Or built directly within `apps/signs`:

```sh
npm ci
npm run build
```

The output is written to `dist-static/`.

For local development inside `apps/signs`:

```sh
npm run dev        # Vite dev server
npm test           # Test parser & generator
npm run typecheck  # TypeScript check
npm run lint       # Linter
```

## Interface Languages

Supports 13 languages: Czech, English, German, Spanish, French, Portuguese, Chinese, Hindi, Arabic (RTL), Bengali, Russian, Japanese, and Indonesian.

The default choice is automatic detection via `navigator.languages`. A manual language selector is available in the header.

## Limits & Accuracy

Default budget is 50 input units including markup tags (UTF-16 code units / UTF-8 bytes).
Preview approximates TextMesh Pro rendering with safe React nodes and Joël Carrouché's Norse font.
