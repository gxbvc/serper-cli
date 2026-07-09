# serper-cli

CLI for the [Serper.dev](https://serper.dev/) Google SERP API. Wraps all 9 Serper endpoints — web search, news, images, videos, places, maps, shopping, scholar, autocomplete — and outputs JSON.

## Prerequisites

- Node.js 18+
- Serper API key ([sign up](https://serper.dev/) — 2,500 free credits)

## Setup

```bash
cd ~/tools/serper-cli
npm install
npm run build
npm link

cp .env.example .env
# Add your SERPER_API_KEY
```

## Commands

```bash
serper-cli search "query"          # Web search (alias: web)
serper-cli news "query"            # Google News
serper-cli images "query"          # Google Images
serper-cli videos "query"          # Google Videos
serper-cli places "query"          # Google Local
serper-cli maps "query"            # Google Maps
serper-cli shopping "query"        # Google Shopping
serper-cli scholar "query"         # Google Scholar
serper-cli autocomplete "query"    # Google autocomplete suggestions
```

## Options (all commands)

Native Serper API parameters, passed straight through. See [Serper docs](https://serper.dev/playground) for the full list.

```
-n, --num <n>           Results per page (Serper `num`, default 10)
--page <n>              1-based page number (Serper `page`)
--gl <code>             Country code (Serper `gl`, e.g. us, gb, de)
--hl <code>             UI language (Serper `hl`, e.g. en, es, de)
--location <text>       Geographic location, e.g. "Austin, Texas, United States"
--tbs <filter>          Google time filter (Serper `tbs`):
                          qdr:d  past 24 hours
                          qdr:w  past week
                          qdr:m  past month
                          qdr:y  past year
--autocorrect <bool>    Disable spell correction with `--autocorrect false`
--site <domain>         Prepends `site:<domain>` to the query (convenience, not a native param)
```

> **Heads up:** these are Serper's native param names (`num`, `page`, `gl`, `hl`, `tbs`), not Brave's (`count`, `offset`, `country`, `lang`, `freshness`). Don't muscle-memory them.

## Examples

```bash
# Web search
serper-cli search "best coffee shops austin texas"
serper-cli search "typescript generics" -n 5 --tbs qdr:m
serper-cli search "security advisories" --site github.com
serper-cli search "tacos" --location "Austin, Texas, United States" --gl us --hl en

# News
serper-cli news "AI regulation" --gl us --tbs qdr:w

# Images
serper-cli images "golden gate bridge sunset" -n 20

# Videos
serper-cli videos "rust async tutorial"

# Local results
serper-cli places "tacos" --location "Austin, Texas, United States"
serper-cli maps "coffee" --location "Brooklyn, NY"

# Shopping
serper-cli shopping "mechanical keyboard" --gl us

# Academic
serper-cli scholar "transformer architecture attention"

# Autocomplete
serper-cli autocomplete "how to make"
```

## Pagination

```bash
serper-cli search "query" -n 10 --page 1
serper-cli search "query" -n 10 --page 2
```

## Output

Standard envelope:

```json
{ "ok": true, "data": { "query": "...", "page": 1, "next_page": 2, "results": [...] } }
```

Web search additionally surfaces these fields when present:

- `answerBox` — Google's direct-answer box
- `knowledgeGraph` — entity panel
- `peopleAlsoAsk` — related Q&A
- `relatedSearches` — query suggestions
- `topStories` — inline news carousel

Errors:

```json
{ "ok": false, "error": "...", "code": "ERROR" }
```

## How It Works

POSTs JSON to `https://google.serper.dev/{endpoint}` with `X-API-KEY` header. Body shape: `{ q, num, page, gl, hl, location, tbs, autocorrect }`.

## Pricing

Serper charges per credit (most endpoints = 1 credit). 2,500 free credits on signup. See [pricing](https://serper.dev/pricing).
