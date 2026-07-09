# serper-cli

Serper.dev (Google SERP) API CLI. All 9 endpoints, JSON in/out.

## Commands

```bash
serper-cli search "query"          # Web (alias: web). Surfaces answerBox/knowledgeGraph/peopleAlsoAsk/relatedSearches/topStories when present.
serper-cli news "query"            # Google News
serper-cli images "query"          # Google Images
serper-cli videos "query"          # Google Videos
serper-cli places "query"          # Google Local
serper-cli maps "query"            # Google Maps
serper-cli shopping "query"        # Google Shopping
serper-cli scholar "query"         # Google Scholar
serper-cli autocomplete "query"    # Suggestions
```

## Options (native Serper param names — do not confuse with Brave's)

```
-n, --num <n>           results per page (default 10)             # Serper: num
--page <n>              1-based page number                       # Serper: page
--gl <code>             country code, e.g. us, gb, de             # Serper: gl
--hl <code>             UI language, e.g. en, es, de              # Serper: hl
--location <text>       e.g. "Austin, Texas, United States"       # Serper: location
--tbs <filter>          qdr:d | qdr:w | qdr:m | qdr:y             # Serper: tbs (Google time filter)
--autocorrect <bool>    --autocorrect false to disable            # Serper: autocorrect
--site <domain>         convenience: prepends `site:<domain>` to q
```

> Mapping vs. `brave-search-cli`: `--num`↔`--count`, `--page`↔`--offset`, `--gl`↔`--country`, `--hl`↔`--lang`, `--tbs qdr:w`↔`--freshness pw`. Different param names, same idea.

## Output

```json
{"ok": true, "data": {"query": "...", "page": 1, "next_page": 2, "results": [...]}}
```

Web search may also include `answerBox`, `knowledgeGraph`, `peopleAlsoAsk`, `relatedSearches`, `topStories` at the top level of `data`.

Errors:

```json
{"ok": false, "error": "...", "code": "ERROR"}
```

## Auth

`.env` with `SERPER_API_KEY`. See `.env.example`. Sign up at https://serper.dev/ (2,500 free credits).

## Endpoint reference

`POST https://google.serper.dev/{search,news,images,videos,places,maps,shopping,scholar,autocomplete}` with `X-API-KEY` header and JSON body `{q, num, page, gl, hl, location, tbs, autocorrect}`.

## When to use vs. brave-search-cli

- `serper-cli` — Google results (what most users actually see), richer local/shopping/scholar coverage, answerBox/knowledgeGraph.
- `brave-search-cli` — independent index, $5 free/month, simpler param surface.
