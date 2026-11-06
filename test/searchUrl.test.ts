// Runs with: node_modules/.bin/tsx test/searchUrl.test.ts
// Reads the shared cases JSON, byte-identical to rails-template's copy.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { unwrap, isWrapper, SearchResult } from "../src/searchUrl.js";

interface SharedCase {
  input: string | null;
  expected: {
    url: string | null;
    host: string | null;
    wrapped: boolean;
    wrapper: string | null;
    status: string;
    reason: string | null;
  };
}

const CASES: SharedCase[] = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "fixtures/search_url_cases.json"), "utf8"),
) as SharedCase[];

let pass = 0;
let fail = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    pass++;
  } catch (e) {
    fail++;
    console.error(`FAIL: ${name}`);
    console.error(e instanceof Error ? e.message : e);
  }
}

// 1. Shared cases
for (let i = 0; i < CASES.length; i++) {
  const tc = CASES[i];
  check(`case ${i}: ${JSON.stringify(tc.input)}`, () => {
    const result: SearchResult = unwrap(tc.input);
    const exp = tc.expected;
    assert.equal(result.status, exp.status, "status");
    assert.equal(result.url, exp.url, "url");
    assert.equal(result.host, exp.host, "host");
    assert.equal(result.wrapped, exp.wrapped, "wrapped");
    assert.equal(result.wrapper, exp.wrapper, "wrapper");
    assert.equal(result.reason, exp.reason, "reason");
  });
}

// 2. wrapper? matches by host AND path, never a blanket google.* rule
check("wrapper? positives", () => {
  assert.equal(isWrapper("https://www.google.com/url?q=https://example.com"), true);
  assert.equal(isWrapper("https://google.com/url"), true);
  assert.equal(isWrapper("https://google.com/goto?sig=x"), true);
  assert.equal(isWrapper("https://google.com/search?q=x"), true);
  assert.equal(isWrapper("https://news.google.com/articles/CBMiAmNo"), true);
  assert.equal(isWrapper("https://duckduckgo.com/l/?uddg=https://example.com"), true);
  assert.equal(isWrapper("https://vertexaisearch.cloud.google.com/grounding-api-redirect/AbC"), true);
});
check("wrapper? negatives (docs/sites/drive are direct)", () => {
  assert.equal(isWrapper("https://docs.google.com/document/d/abc/edit"), false);
  assert.equal(isWrapper("https://sites.google.com/view/site/home"), false);
  assert.equal(isWrapper("https://drive.google.com/file/d/abc/view"), false);
  assert.equal(isWrapper("https://example.com"), false);
  assert.equal(isWrapper("not a url"), false);
  assert.equal(isWrapper(null), false);
  assert.equal(isWrapper(""), false);
});

// 3. Never throws on junk input
check("never throws on junk input", () => {
  const junk: unknown[] = [
    null, undefined, "", "   ", "\n\t", "\x00\x01\x02", "%%%%", "://", "http://",
    "https://exa mple.com", "http://[::1]:99999/", "https://例え.テスト/ページ",
    `https://${"a".repeat(2000)}.com`, "-", "HTTP/1.1 200 OK", "https://example.com:notaport/",
    ["array"], { hash: 1 }, 3.14, 42, true,
  ];
  for (const j of junk) {
    unwrap(j as string | null | undefined);
    isWrapper(j as string | null | undefined);
  }
});

// 4. Invalid UTF-8 bytes: JSON cannot carry them (a JSON file is Unicode
// text), so the never-throw checks live here; Ruby has its own copy in
// test/lib/search_url_test.rb. JS strings are always valid UTF-16, so the
// nearest equivalent of raw invalid bytes is a lone surrogate.
check("never throws on invalid UTF-8 bytes (lone surrogates)", () => {
  const bad = ["http://example.com/\uD800", "http://\uD800.com/", "http://example.com/\uDFFF"];
  for (const b of bad) {
    unwrap(b);
    isWrapper(b);
  }
});

// 5. ~20,000 chars, built here so the shared JSON stays small.
check("never throws on a very long URL", () => {
  const long = `https://example.com/${"a".repeat(20000)}`;
  const r = unwrap(long);
  assert.equal(r.status, "direct");
});

console.log(`${pass + fail} checks, ${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
