// Offline, pure search-URL unwrapping. No network, never throws.
//
// This function is NOT an SSRF guard. A hostname can resolve to 127.0.0.1,
// 10.x or 169.254.169.254. Any code that fetches a URL from here must check
// the resolved IP at connect time (refuse loopback, private, link-local,
// CGNAT 100.64.0.0/10, the metadata IP, IPv6 ULA and link-local) and check
// again on every redirect. The "invalid" rules are a first filter for display
// and dedupe only.
//
// Port of rails-template lib/search_url.rb (shared interface, see
// ~/tmp/misc-serper-unwrap-interface.md):
// - unwrap(url) -> SearchResult
// - isWrapper(url) -> boolean
//
// The shared test cases live in test/fixtures/search_url_cases.json and are
// byte-identical to the copy in rails-template.

export type Wrapper =
  | "google_url"
  | "google_goto"
  | "google_search"
  | "google_news"
  | "google_amp"
  | "bing_ck"
  | "duckduckgo_l"
  | "vertex_grounding";

export type UrlStatus = "direct" | "unwrapped" | "opaque_wrapper" | "invalid";

export interface SearchResult {
  /** Candidate destination URL after unwrapping (null for opaque/invalid). Not proven final: it may still HTTP-redirect; callers verify the final fetch URL and content before writing a source. */
  url: string | null;
  /** Lowercased publisher host, leading www. stripped (null unless direct/unwrapped). */
  host: string | null;
  wrapped: boolean;
  /** Outermost wrapper detected. */
  wrapper: Wrapper | null;
  status: UrlStatus;
  reason: string | null;
}

/** Nested wrappers are unwrapped up to 3 levels; a 4th-level wrapper is invalid. */
const MAX_UNWRAPS = 3;

const TRACKING_KEYS = new Set(["gclid", "fbclid"]);
const TRACKING_PREFIXES = ["utm_"];

const OPAQUE_REASONS: Record<string, string> = {
  google_search: "google.com/search target not in URL",
  google_news: "news.google.com article id: target not in URL",
  google_goto: "google.com/goto without embedded target",
  vertex_grounding: "vertex grounding redirect id: target not in URL",
};

export function unwrap(url: string | null | undefined): SearchResult {
  return unwrapLevel(url, 0);
}

export function isWrapper(url: string | null | undefined): boolean {
  if (typeof url !== "string" || url.trim() === "") return false;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (!isHttp(parsed)) return false;
  return wrapperFor(normalizedHost(parsed.hostname), parsed.pathname) !== null;
}

function invalidResult(reason: string): SearchResult {
  return { url: null, host: null, wrapped: false, wrapper: null, status: "invalid", reason };
}

function unwrapLevel(input: string | null | undefined, depth: number): SearchResult {
  if (typeof input !== "string" || input.trim() === "") {
    return invalidResult("empty or not a string");
  }

  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return invalidResult("unparseable URL");
  }
  if (!isHttp(parsed)) return invalidResult("non-http(s) scheme");
  if (parsed.username !== "" || parsed.password !== "") {
    return invalidResult("credentials in URL");
  }

  const host = normalizedHost(parsed.hostname);
  if (host === "") return invalidResult("unparseable URL");
  if (isIpLiteral(host)) return invalidResult("IP literal host");
  if (isPrivateHost(host)) return invalidResult("private host");

  const wrapper = wrapperFor(host, parsed.pathname);
  if (wrapper === null) {
    return {
      url: normalizeUrl(parsed), host, wrapped: false,
      wrapper: null, status: "direct", reason: null,
    };
  }

  const target = extractTarget(wrapper, parsed);
  if (target === null) {
    // Opaque wrappers stay out of hit budgets and miss stamps; resolving
    // them needs a network step that is out of scope here.
    return {
      url: null, host: null, wrapped: true, wrapper,
      status: "opaque_wrapper", reason: OPAQUE_REASONS[wrapper] ?? null,
    };
  }

  if (depth >= MAX_UNWRAPS) {
    return {
      url: null, host: null, wrapped: true, wrapper,
      status: "invalid", reason: "wrapper nested more than 3 levels",
    };
  }

  const inner = unwrapLevel(target, depth + 1);
  if (inner.status === "direct" || inner.status === "unwrapped") {
    return {
      url: inner.url, host: inner.host, wrapped: true, wrapper,
      status: "unwrapped", reason: null,
    };
  }
  if (inner.status === "opaque_wrapper") return inner;

  // :invalid
  const reason =
    inner.reason === "wrapper nested more than 3 levels"
      ? inner.reason
      : `unwrapped target: ${inner.reason}`;
  return { url: null, host: null, wrapped: true, wrapper, status: "invalid", reason };
}

function isHttp(parsed: URL): boolean {
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

// Detection is by host AND path. Only exact "google.com" (after www.
// stripping) is a Google wrapper; docs/sites/drive.google.com fall through.
function wrapperFor(host: string, path: string): Wrapper | null {
  const p = path.toLowerCase();
  switch (host) {
    case "google.com":
      if (p === "/url" || p.startsWith("/url/")) return "google_url";
      if (p === "/goto" || p.startsWith("/goto/")) return "google_goto";
      if (p.startsWith("/search")) return "google_search";
      if (p.startsWith("/amp/")) return "google_amp";
      return null;
    case "news.google.com":
      return p.startsWith("/articles") ? "google_news" : null;
    case "cdn.ampproject.org":
      return p.startsWith("/c/") ? "google_amp" : null;
    case "bing.com":
      return p.startsWith("/ck/a") ? "bing_ck" : null;
    case "duckduckgo.com":
      return p === "/l" || p.startsWith("/l/") ? "duckduckgo_l" : null;
    case "vertexaisearch.cloud.google.com":
      return p.startsWith("/grounding-api-redirect") ? "vertex_grounding" : null;
    default:
      return null;
  }
}

function extractTarget(wrapper: Wrapper, parsed: URL): string | null {
  switch (wrapper) {
    case "google_url":
    case "google_goto":
      return queryParam(parsed, "q") ?? queryParam(parsed, "url");
    case "duckduckgo_l":
      return queryParam(parsed, "uddg");
    case "bing_ck":
      return decodeBingU(queryParam(parsed, "u"));
    case "google_amp":
      return ampTarget(parsed.pathname);
    default: // opaque wrappers carry no target in the URL
      return null;
  }
}

function queryParam(parsed: URL, name: string): string | null {
  return parsed.searchParams.has(name) ? (parsed.searchParams.get(name) ?? "") : null;
}

// Bing encodes the target as base64url, usually behind an "a1" marker.
function decodeBingU(value: string | null): string | null {
  if (value === null) return null;
  for (const candidate of [value, value.replace(/^a1/, "")]) {
    try {
      const decoded = Buffer.from(candidate, "base64url").toString("utf8");
      if (decoded.startsWith("http://") || decoded.startsWith("https://")) return decoded;
    } catch {
      // keep trying
    }
  }
  return null;
}

// Paths look like /amp/s/example.com/page (https) or /c/example.com/page (http).
function ampTarget(path: string): string | null {
  const rest = path.replace(/^\/(amp|c)\//, "");
  if (rest === "") return null;
  if (rest.startsWith("s/")) return `https://${rest.slice(2)}`;
  return `http://${rest}`;
}

// Lowercase scheme and host, drop the fragment, drop tracking params.
function normalizeUrl(parsed: URL): string {
  const port = parsed.port === "" ? "" : `:${parsed.port}`;
  const path = parsed.pathname === "" ? "/" : parsed.pathname;

  const kept: [string, string][] = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    const lower = key.toLowerCase();
    if (TRACKING_KEYS.has(lower)) continue;
    if (TRACKING_PREFIXES.some((p) => lower.startsWith(p))) continue;
    kept.push([key, value]);
  }
  const query = kept.length === 0 ? null : new URLSearchParams(kept).toString();

  return `${parsed.protocol}//${parsed.hostname}${port}${path}${query === null ? "" : `?${query}`}`;
}

function normalizedHost(host: string): string {
  let h = host.toLowerCase();
  while (h.endsWith(".")) h = h.slice(0, -1);
  if (h.startsWith("www.")) h = h.slice(4);
  return h;
}

function isIpLiteral(host: string): boolean {
  if (host.includes(":")) return true; // IPv6 literal
  // Any label count (1 or more): every label is all decimal digits, or
  // hex with a 0x prefix. Covers 2130706433, 127.1, 0x7f.0.0.1,
  // 0x7f000001, 0177.0.0.1 and the normal 4-part form.
  return host.split(".").every((label) => /^(?:\d+|0x[0-9a-f]*)$/i.test(label));
}

function isPrivateHost(host: string): boolean {
  // Single-label hosts (http://intranet/, http://router/) have no public
  // name to resolve: refuse them like the dot-suffixes below.
  if (!host.includes(".")) return true;
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".arpa") ||
    host.endsWith(".home") ||
    host.endsWith(".corp")
  );
}
