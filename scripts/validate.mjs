import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("plugins/manga/comic-verse/index.ts", "utf8");
const bundle = await readFile("dist/manga/comic-verse.plugin.js", "utf8");
const manifest = JSON.parse(await readFile("plugins/manga/comic-verse/manifest.json", "utf8"));
const repoIndex = JSON.parse(await readFile("dist/manga/repo.json", "utf8"));

assert.equal(source, bundle, "published bundle must match the source file exactly");
assert.equal(manifest.version, "1.3.0");
assert.equal(repoIndex.plugins[0].version, manifest.version);
assert.equal(repoIndex.plugins[0].entry, "comic-verse.plugin.js");

let registered;
const providerHost = {
  register(provider) { registered = provider; }
};
new Function("harbor", bundle)(providerHost);

assert.ok(registered, "provider must register");
assert.equal(registered.id, "comic-verse");
for (const method of ["popular", "search", "detail", "chapters", "pageUrls"]) {
  assert.equal(typeof registered[method], "function", method + " must exist");
}

// Reader parity regression: Harbor drops CSS-hidden nodes while parsing a full page.
// Mihon's Jsoup keeps #cvOriginal, so isolate that element before Harbor parses it.
const chapterUrl = "https://arcomixverse.blogspot.com/2025/11/8_25.html";
let httpRequest;
const fullChapterHtml = '<html><head><style>#cvOriginal{display:none}</style></head><body>' +
  '<div id="cvOriginal" style="display:none"><div class="separator"><a><img src="https://cdn.example/001.jpg"></a></div>' +
  '<div class="separator"><img src="/images/002.jpg"></div><img data-src="/ignored.jpg"></div><div id="cv-original"></div></body></html>';
const readerHost = {
  async http(url, options) {
    httpRequest = { url, options };
    return { ok: true, status: 200, body: fullChapterHtml };
  },
  async parseHtml() { throw new Error("pageUrls must not parse/sanitize the reader fragment"); }
};
let readerProvider;
new Function("harbor", bundle)({
  ...readerHost,
  register(provider) { readerProvider = provider; }
});
const pages = await readerProvider.pageUrls(chapterUrl);
assert.deepEqual(pages, [
  "https://cdn.example/001.jpg",
  "https://arcomixverse.blogspot.com/images/002.jpg"
]);
assert.equal(httpRequest.url, chapterUrl);
assert.equal(httpRequest.options.responseType, "text");

// Chapter-feed smoke test: use the series page's data-label and fetch every
// Blogger page until openSearch$totalResults has been reached.
const seriesUrl = "https://arcomixverse.blogspot.com/2025/01/sample-series.html";
const chapterEntries = (start, count) => Array.from({ length: count }, (_, index) => ({
  title: { $t: "العدد " + (start + index) },
  published: { $t: "2025-01-01T00:00:00.000Z" },
  category: [{ term: "Chapter" }],
  link: [{ rel: "alternate", href: "https://arcomixverse.blogspot.com/2025/01/ch-" + (start + index) + ".html" }]
}));
const feedCalls = [];
let chapterProvider;
const chapterHost = {
  async http(url, options) {
    if (options.responseType === "text") {
      return { ok: true, status: 200, body: '<div id="clwd"><script>clwd.run("SCRIPT-LABEL")</script></div>' };
    }
    feedCalls.push(String(url));
    const parsed = new URL(String(url));
    const start = Number(parsed.searchParams.get("start-index"));
    return {
      feed: {
        "openSearch$totalResults": { $t: "151" },
        entry: start === 1 ? chapterEntries(1, 150) : chapterEntries(151, 1)
      }
    };
  },
  async parseHtml() {
    return {
      querySelector(selector) {
        assert.equal(selector, "[data-label]");
        return { attr(name) { return name === "data-label" ? "SAMPLE-SERIES" : null; } };
      }
    };
  },
  register(provider) { chapterProvider = provider; }
};
new Function("harbor", bundle)(chapterHost);
const chapters = await chapterProvider.chapters(seriesUrl);
assert.equal(chapters.length, 151);
assert.equal(feedCalls.length, 2);
assert.ok(feedCalls[0].includes("/-/Chapter/SCRIPT-LABEL"), "the #clwd script feed must take precedence over data-label");
assert.equal(new URL(feedCalls[0]).searchParams.get("start-index"), "1");
assert.equal(new URL(feedCalls[1]).searchParams.get("start-index"), "151");

console.log("Comic Verse validation passed: source/bundle, provider contract, Mihon-style page parsing, and complete chapter pagination.");
