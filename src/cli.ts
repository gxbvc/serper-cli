import { Command } from "commander";
import { getApiKey } from "./config.js";
import {
  webSearch,
  newsSearch,
  imageSearch,
  videoSearch,
  placesSearch,
  mapsSearch,
  shoppingSearch,
  scholarSearch,
  autocomplete,
  BaseOptions,
} from "./api.js";

function success(data: unknown) {
  console.log(JSON.stringify({ ok: true, data }));
}

function error(msg: string, code = "ERROR") {
  console.log(JSON.stringify({ ok: false, error: msg, code }));
  process.exit(1);
}

function parseOpts(opts: any): BaseOptions {
  const out: BaseOptions = {};
  if (opts.num !== undefined) out.num = parseInt(opts.num);
  if (opts.page !== undefined) out.page = parseInt(opts.page);
  if (opts.gl) out.gl = opts.gl;
  if (opts.hl) out.hl = opts.hl;
  if (opts.location) out.location = opts.location;
  if (opts.tbs) out.tbs = opts.tbs;
  if (opts.autocorrect !== undefined) out.autocorrect = opts.autocorrect !== "false";
  if (opts.site) out.site = opts.site;
  return out;
}

const program = new Command()
  .name("serper-cli")
  .description(
    [
      "Serper.dev (Google SERP) API CLI.",
      "",
      "Endpoints: search, news, images, videos, places, maps, shopping, scholar, autocomplete.",
      "",
      "Native Serper params (passed straight through to the API):",
      "  -n, --num <n>         results per page (default 10)",
      "  --page <n>            1-based page number (default 1)",
      "  --gl <code>           country code, e.g. us, gb, de",
      "  --hl <code>           UI language, e.g. en, es, de",
      "  --location <text>     e.g. 'Austin, Texas, United States'",
      "  --tbs <filter>        Google freshness/filter: qdr:d, qdr:w, qdr:m, qdr:y",
      "  --autocorrect <bool>  default true",
      "  --site <domain>       prepended as `site:<domain>` to the query",
    ].join("\n")
  )
  .version("1.0.0");

function addCommonOptions(cmd: Command): Command {
  return cmd
    .option("-n, --num <n>", "Results per page (Serper `num`, default 10)")
    .option("--page <n>", "1-based page number (Serper `page`)")
    .option("--gl <code>", "Country code (Serper `gl`, e.g. us, gb, de)")
    .option("--hl <code>", "UI language (Serper `hl`, e.g. en, es)")
    .option("--location <text>", "Geographic location (Serper `location`)")
    .option("--tbs <filter>", "Google time filter (Serper `tbs`, e.g. qdr:d, qdr:w, qdr:m, qdr:y)")
    .option("--autocorrect <bool>", "Disable with --autocorrect false (Serper `autocorrect`)")
    .option("--site <domain>", "Restrict to a site (prepends `site:<domain>` to query)");
}

function makeCommand(
  name: string,
  description: string,
  fn: (q: string, o: BaseOptions, key: string) => Promise<unknown>,
  alias?: string
) {
  const cmd = program.command(name).description(description).argument("<query>", "Search query");
  if (alias) cmd.alias(alias);
  addCommonOptions(cmd).action(async (query, opts) => {
    try {
      const key = getApiKey();
      const data = await fn(query, parseOpts(opts), key);
      success(data);
    } catch (e: any) {
      error(e.message);
    }
  });
}

makeCommand("search", "Web search (Google organic results + answerBox/knowledgeGraph/peopleAlsoAsk)", webSearch, "web");
makeCommand("news", "Google News search", newsSearch);
makeCommand("images", "Google Images search", imageSearch);
makeCommand("videos", "Google Videos search", videoSearch);
makeCommand("places", "Google Local (places) search", placesSearch);
makeCommand("maps", "Google Maps search", mapsSearch);
makeCommand("shopping", "Google Shopping search", shoppingSearch);
makeCommand("scholar", "Google Scholar search", scholarSearch);
makeCommand("autocomplete", "Google autocomplete suggestions", autocomplete);

program.parseAsync();
