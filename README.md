# UpgradeSkip: Inventory Delta Advisor

Check what you're thinking of buying against what you already own.

**Non-developers:** open **[START-HERE.md](./START-HERE.md)** and double-click **`START.bat`** (Windows).

Runs fully on your machine, no Vercel / cloud account required.

---

## Quick start (everyone)

| Step | Action |
|---|---|
| 1 | Install [Node.js LTS](https://nodejs.org) (once) |
| 2 | Windows: double-click `START.bat` · Mac: `./start.sh` |
| 3 | Browser opens → http://localhost:8787 |

Share with a teammate:

```bash
npm run pack
```

→ creates `UpgradeSkip-portable.zip`

---

## Developers

```bash
npm install
npm run host          # build + serve UI+API on :8787
npm run dev:all       # hot reload (UI :5173, API :3001)
npm start             # serve existing build
```

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8787` | Listen port (`START` auto-picks another if busy) |
| `DB_PATH` | `data/app.db` | Local SQLite file |
| `LLM_API_KEY` | _(unset)_ | Enables LLM research for unknown products |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible endpoint (Ollama: `http://127.0.0.1:11434/v1`) |
| `LLM_MODEL` | `gpt-4o-mini` | Model name |

Copy `.env.example` → `.env` to configure. Local catalog is always tried first; LLM results are cached in SQLite.

| Folder | Role |
|---|---|
| `src/app` | React UI |
| `src/core` | Decide / compare engine |
| `src/server` | API + SQLite |
| `src/db` | Schema + mappers |
| `scripts/` | Launch + zip helpers |

## How a verdict is made

1. **Match** (`src/core/match.ts`): the query must name one exact model. Every word of a
   product name has to be present, and nothing in the query may point at a different
   model (`Pro Max` ≠ `Pro`, `AirPods Max` ≠ `AirPods Pro`). Vague queries (`ipad`)
   get "Did you mean…?" suggestions instead of a silent substitute. Unknown models go
   to the LLM, which is told to return that exact model or nothing.
2. **Normalise** (`src/core/specs.ts`): every category has a fixed spec schema (key,
   direction, importance, noticeable-change threshold). Catalog, LLM and old database
   rows are all mapped onto it.
3. **Compare** (`src/core/compare.ts`): each spec is *better*, *worse*, *about the
   same*, *different* (e.g. screen size) or *no data*. Core specs score 2, minor
   specs 1, half if the change is small. Missing data is never scored.
4. **Decide** (`src/core/verdict.ts`): net score after losses → skip / wait / buy, with
   a lower bar when your device is 3+ years old. The LLM may reword the explanation
   but cannot change the verdict.

Run `npm test` to check matcher and verdict behaviour (no build needed).

## Troubleshooting

See **START-HERE.md**. Common fixes:

- Install Node LTS (22+) and restart the PC
- Port busy → launcher chooses the next free port; use the URL it prints
- Delete `node_modules` and run `npm install` if the server fails after upgrading Node
