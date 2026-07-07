# ClearWrite ✓

A free, standalone, private writing assistant in the spirit of Grammarly — with **no subscription, no account, and no server**. Everything runs locally in your browser; your text never leaves your computer.

![ClearWrite](https://img.shields.io/badge/price-free_forever-15c39a) ![Offline](https://img.shields.io/badge/works-100%25_offline-blue)

## Use it right now (no install)

The entire app is compiled into **one file**: [`ClearWrite.html`](./ClearWrite.html).

1. Download `ClearWrite.html`
2. Double-click it (opens in any modern browser)
3. Start writing

That's it. It works offline, from a `file://` URL, with the full English spelling dictionary built in. Your document, personal dictionary, and dismissed suggestions are saved in your browser's local storage between visits.

## What it checks

Suggestions appear as colored underlines in the editor and as cards in the sidebar, grouped Grammarly-style into four categories:

| Category | Color | Examples |
|---|---|---|
| **Correctness** | 🔴 red | Spelling (Hunspell dictionary), repeated words, a/an agreement, "could of" → "could have", missing apostrophes (dont → don't), subject–verb agreement, then/than, its/it's, double comparatives ("more better"), capitalization, punctuation spacing |
| **Clarity** | 🔵 blue | Wordy phrases ("in order to" → "to"), redundancies ("end result" → "result"), passive voice, hard-to-read long sentences |
| **Engagement** | 🟢 green | Weak intensifiers ("very good" → "excellent"), overused words, clichés |
| **Delivery** | 🟣 purple | Hedging ("I think"), informal language ("gonna"), multiple exclamation marks, ALL-CAPS shouting |

Plus live document stats: an overall score (0–100), word/character/sentence counts, reading time, and Flesch readability.

Every suggestion offers one-click **apply**, **dismiss** (remembered), and — for spelling — **add to dictionary**.

## Develop

```bash
npm install
npm run dev      # dev server with hot reload
npm test         # engine unit tests (vitest)
npm run build    # produces dist/index.html and copies it to ClearWrite.html
```

## How it works

- **React + TypeScript + Vite**, bundled to a single self-contained HTML file via `vite-plugin-singlefile`.
- **Spelling** uses [`nspell`](https://github.com/wooorm/nspell) (Hunspell in JavaScript) with the bundled `dictionary-en` word list — no API calls.
- **Grammar & style** come from a rule engine (`src/engine/rules.ts`) of ~25 rule sets; each returns issues with text offsets and replacement suggestions.
- The editor is a `<textarea>` with a synced backdrop layer that renders the colored underlines behind your text.

## Privacy

There is no telemetry, no network request of any kind, and no data collection. The only persistence is `localStorage` in your own browser.
