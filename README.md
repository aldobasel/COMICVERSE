# Comic Verse 🇪🇬📚

**A Mihon-aligned Arabic comics and manga source for Harbor**

Comic Verse brings the Blogger-based Comic Verse catalog into Harbor while following the same source flow as the official Mihon ComicVerse extension wherever Harbor's provider API allows it.

## Source behavior

- **Popular:** reads the homepage and uses Mihon's `div.PopularPosts figure` selector.
- **Search:** uses Blogger's JSON feed with the same included/excluded category-label query model as ZeistManga.
- **Details:** resolves a series by its exact Blogger permalink path, then reads the series page.
- **Chapters:** follows ZeistManga's feed resolution order: `#clwd > script`, legacy `#myUL > script`, `#latest > script`, then the ComicVerse `[data-label]` fallback. It paginates Blogger results using `openSearch$totalResults`.
- **Pages:** requests the chapter URL as HTML and extracts only `#cvOriginal img[src]` through Harbor's HTML parser. No regex image scraping, page cache, or alternate feed fallback is used.

The page-loading sequence mirrors Mihon's implementation:

1. GET the chapter URL as an HTML document.
2. Parse the document.
3. Select `#cvOriginal`.
4. Select `img[src]` only inside that element.
5. Resolve each image's `src` against the chapter URL and preserve document order.

Harbor uses `harbor.http` and `harbor.parseHtml` in place of Mihon's OkHttp and Jsoup APIs. The source does not pretend those host APIs are identical; it maps the same request and selector behavior onto Harbor's documented provider contract.

## Install

Repository URL:

```text
https://aldobasel.github.io/COMICVERSE/manga/repo.json
```

In Harbor:

1. Open **Manga**.
2. Open **Set up a source** → **Extensions**.
3. Add the repository URL above.
4. Refresh the repository and install **Comic Verse**.

## Repository layout

```text
COMICVERSE/
├── .github/workflows/deploy.yml
├── plugins/manga/comic-verse/
│   ├── index.ts
│   └── manifest.json
├── dist/manga/
│   ├── comic-verse.plugin.js
│   └── repo.json
└── scripts/validate.mjs
```

The source and published bundle are kept byte-for-byte synchronized and checked before deployment.

## Deployment and validation

Every push to `main` runs the validation script, verifies the provider contract and the Mihon-style page selector flow, then publishes the `dist/manga` repository to GitHub Pages.

## Credits

- Original source behavior: [Keiyoushi Mihon extensions](https://github.com/keiyoushi/extensions-source)
- Harbor plugin runtime and API: [Harbor](https://github.com/Harborofficial/Harbor)

Comic Verse is an independent community plugin. It is not affiliated with the Comic Verse website, Mihon, Keiyoushi, or Harbor. All site content remains hosted by its respective publisher.
