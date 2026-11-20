const BASE = "https://arcomixverse.blogspot.com";
const FEED = BASE + "/feeds/posts/default";
const CHAPTER_CATEGORY = "Chapter";
const PAGE_SIZE = 150;

const INCLUDED_CATEGORIES = [
  "Series", "Manga", "Manhwa", "Manhua", "Doujinshi",
  "Web Novel (JP)", "Web Novel (KR)", "Web Novel (CN)"
];
const EXCLUDED_CATEGORIES = ["Anime", "Novel", "Novela", CHAPTER_CATEGORY];

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(raw, base) {
  const value = clean(raw);
  if (!value) return undefined;
  try {
    const url = new URL(value, base || BASE);
    return /^https?:$/.test(url.protocol) ? url.href : undefined;
  } catch (_) {
    return undefined;
  }
}

function getAlternateUrl(entry) {
  const links = Array.isArray(entry && entry.link) ? entry.link : [];
  const link = links.find(function (item) { return item && item.rel === "alternate"; });
  return link ? absoluteUrl(link.href, BASE) : undefined;
}

function getLabels(entry) {
  return (Array.isArray(entry && entry.category) ? entry.category : [])
    .map(function (item) { return clean(item && item.term); })
    .filter(Boolean);
}

function hasLabel(entry, label) {
  return getLabels(entry).includes(label);
}

function feedUrl(path) {
  return new URL(FEED + (path || ""));
}

async function getFeed(url) {
  const data = await harbor.http(String(url), {
    responseType: "json",
    timeoutMs: 30000
  });
  if (!data || !data.feed) {
    throw new Error("Comic Verse: Blogger returned an invalid feed");
  }
  return data.feed;
}

async function getDocumentResponse(url) {
  const response = await harbor.http(String(url), {
    responseType: "text",
    timeoutMs: 30000
  });
  if (!response || !response.ok) {
    throw new Error("Comic Verse: HTTP " + (response ? response.status : "unknown") + " while loading " + url);
  }
  return {
    body: response.body || "",
    document: await harbor.parseHtml(response.body || "")
  };
}

async function getDocument(url) {
  return (await getDocumentResponse(url)).document;
}

// Mihon's Jsoup parser keeps elements even when the page CSS hides them.
// Harbor's parser removes CSS-hidden nodes before exposing its query tree. Extract
// the target reader element from the raw response first, so its page stylesheet
// cannot make #cvOriginal disappear during parsing.
function extractElementById(html, id) {
  const opening = new RegExp("<([a-z][\\w:-]*)\\b[^>]*\\bid\\s*=\\s*([\"'])" + id + "\\2[^>]*>", "i").exec(html);
  if (!opening) return null;
  const tagName = opening[1];
  const tagPattern = new RegExp("</?" + tagName + "\\b[^>]*>", "gi");
  tagPattern.lastIndex = opening.index + opening[0].length;
  let depth = 1;
  let tag;
  while ((tag = tagPattern.exec(html))) {
    if (/^<\//.test(tag[0])) depth--;
    else if (!/\/\s*>$/.test(tag[0])) depth++;
    if (depth === 0) return html.slice(opening.index, tagPattern.lastIndex);
  }
  return null;
}
function getThumbnail(entry) {
  const media = entry && entry["media$thumbnail"];
  if (media && media.url) {
    return String(media.url)
      .replace(/\/s.+?-c\//, "/w600/")
      .replace(/=s(?!.*=s).+?-c$/, "=w600");
  }
  return undefined;
}

async function entryToSummary(entry) {
  const title = clean(entry && entry.title && entry.title.$t);
  const id = getAlternateUrl(entry);
  if (!title || !id) return null;

  let cover = getThumbnail(entry);
  if (!cover && entry.content && entry.content.$t) {
    const contentDoc = await harbor.parseHtml(entry.content.$t);
    const image = contentDoc.querySelector("img[src]");
    cover = image ? absoluteUrl(image.attr("src"), id) : undefined;
  }

  const labels = getLabels(entry);
  const yearMatch = title.match(/\b(19|20)\d{2}\b/);
  let status;
  if (labels.includes("مستمر") || labels.includes("مستمرة")) status = "Ongoing";
  else if (labels.includes("مكتمل") || labels.includes("مكتملة")) status = "Completed";

  return {
    id: id,
    title: title,
    cover: absoluteUrl(cover, id),
    year: yearMatch ? Number(yearMatch[0]) : undefined,
    status: status
  };
}

function searchQuery(query) {
  const parts = [];
  INCLUDED_CATEGORIES.forEach(function (label) {
    parts.push('label:"' + label + '"');
  });
  EXCLUDED_CATEGORIES.forEach(function (label) {
    parts.push('-label:"' + label + '"');
  });
  const term = clean(query);
  if (term) parts.push(term);
  return "{" + parts.slice(0, INCLUDED_CATEGORIES.length).join(" ") + "} " +
    parts.slice(INCLUDED_CATEGORIES.length).join(" ");
}

function chapterNumber(title) {
  const match = clean(title).match(/(?:العدد|#)\s*#?\s*(\d+(?:\.\d+)?)/i);
  return match ? match[1] : null;
}

function chapterFeedUrl(label) {
  const url = feedUrl("/-/" + CHAPTER_CATEGORY + "/" + encodeURIComponent(label));
  url.searchParams.set("alt", "json");
  return url;
}

// ZeistManga checks #clwd > script, then the legacy #myUL script, then #latest.
// Harbor strips scripts from parsed documents, so inspect raw HTML only for feed
// declarations. Chapter images are always extracted through harbor.parseHtml.
function directScriptById(html, id) {
  const open = new RegExp("<([a-z][\\w:-]*)\\b[^>]*\\bid\\s*=\\s*([\\\"'])" + id + "\\2[^>]*>", "i").exec(html);
  if (!open) return null;
  const rest = html.slice(open.index + open[0].length);
  const script = /^\s*<script\b([^>]*)>([\s\S]*?)<\/script\s*>/i.exec(rest);
  if (!script) return null;
  return { attributes: script[1] || "", content: script[2] || "" };
}

function attributeValue(attributes, name) {
  const match = new RegExp("\\b" + name + "\\s*=\\s*(?:[\\\"']([^\\\"']*)[\\\"']|([^\\s>]+))", "i").exec(attributes);
  return match ? (match[1] || match[2] || "") : "";
}

function resolveChapterFeed(rawHtml, dataLabel) {
  const primary = directScriptById(rawHtml, "clwd");
  if (primary) {
    const match = /clwd\.run\([\"'](.*?)[\"']\)/.exec(primary.content);
    return chapterFeedUrl(match ? match[1] : dataLabel);
  }

  const legacy = directScriptById(rawHtml, "myUL");
  if (legacy) {
    const src = attributeValue(legacy.attributes, "src");
    const match = /([^']+)\?/.exec(src);
    if (match) {
      const url = new URL(match[1], BASE);
      url.searchParams.set("alt", "json");
      return url;
    }
  }

  const latest = directScriptById(rawHtml, "latest");
  if (latest) {
    const match = /label\s*=\s*'([^']+)'/.exec(latest.content);
    if (match) {
      const url = feedUrl("/-/" + encodeURIComponent(match[1]));
      url.searchParams.set("alt", "json");
      url.searchParams.set("start-index", "1");
      url.searchParams.set("max-results", "999999");
      return url;
    }
  }

  return chapterFeedUrl(dataLabel);
}

async function getAllChapterEntries(url) {
  const entries = [];
  let startIndex = 1;
  let totalResults = 0;

  while (true) {
    const pageUrl = new URL(String(url));
    pageUrl.searchParams.set("alt", "json");
    pageUrl.searchParams.set("start-index", String(startIndex));
    pageUrl.searchParams.set("max-results", String(PAGE_SIZE));

    const feed = await getFeed(pageUrl);
    const pageEntries = Array.isArray(feed.entry) ? feed.entry : [];
    entries.push.apply(entries, pageEntries);

    const total = feed["openSearch$totalResults"];
    totalResults = Number(total && total.$t) || 0;

    if (!pageEntries.length || !totalResults || entries.length >= totalResults) {
      break;
    }
    startIndex = entries.length + 1;
  }

  return entries;
}

function postPath(rawUrl) {
  const url = new URL(rawUrl);
  return url.pathname;
}

function isSeriesEntry(entry) {
  const labels = getLabels(entry);
  return labels.some(function (label) {
    return INCLUDED_CATEGORIES.includes(label);
  }) && !EXCLUDED_CATEGORIES.some(function (label) {
    return labels.includes(label);
  });
}

function parseStatus(value) {
  const status = clean(value).toLowerCase();
  if (["ongoing", "مستمر", "مستمرة", "en curso", "activo", "ativo"].includes(status)) return "Ongoing";
  if (["completed", "مكتمل", "مكتملة", "finalizado", "completo"].includes(status)) return "Completed";
  if (["hiatus", "paused", "متوقف", "متوقفة"].includes(status)) return "Hiatus";
  if (["cancelled", "canceled", "dropped", "ملغي", "ملغاة"].includes(status)) return "Cancelled";
  return undefined;
}

const plugin = {
  id: "comic-verse",
  name: "Comic Verse",

  async popular(offset) {
    const doc = await getDocument(BASE + "/");
    return doc.querySelectorAll("div.PopularPosts figure").map(function (figure) {
      const link = figure.querySelector("figcaption > a");
      const image = figure.querySelector("img");
      if (!link) return null;
      const id = absoluteUrl(link.attr("href"), BASE);
      const title = clean(link.text());
      if (!id || !title) return null;
      return {
        id: id,
        title: title,
        cover: image ? absoluteUrl(image.attr("src"), id) : undefined
      };
    }).filter(Boolean);
  },

  async search(query, offset) {
    const url = feedUrl("");
    url.searchParams.set("alt", "json");
    url.searchParams.set("q", searchQuery(query));
    url.searchParams.set("max-results", "48");
    url.searchParams.set("start-index", String((Number(offset) || 0) + 1));

    const feed = await getFeed(url);
    const entries = (Array.isArray(feed.entry) ? feed.entry : []).filter(isSeriesEntry);
    const summaries = await Promise.all(entries.map(entryToSummary));
    return summaries.filter(Boolean);
  },

  async detail(id) {
    const mangaUrl = absoluteUrl(id, BASE);
    if (!mangaUrl) return null;

    // Mihon's getMangaByUrl resolves Blogger posts by their exact permalink path.
    const lookup = feedUrl("");
    lookup.searchParams.set("alt", "json");
    lookup.searchParams.set("path", postPath(mangaUrl));
    const feed = await getFeed(lookup);
    const entries = Array.isArray(feed.entry) ? feed.entry : [];
    const entry = entries.find(function (item) {
      return getAlternateUrl(item) === mangaUrl;
    }) || entries[0];

    if (!entry || !isSeriesEntry(entry)) return null;

    const doc = await getDocument(mangaUrl);
    const root = doc.querySelector(".grid.gtc-235fr");
    if (!root) {
      throw new Error("Comic Verse: the series details container .grid.gtc-235fr was not found");
    }

    const image = root.querySelector("img");
    const description = root.querySelector("#synopsis");
    const altTitle = root.querySelector("header > p");
    const author = root.querySelector("span#author");
    const status = root.querySelector("span[data-status]");
    let authorText = author ? author.text() : "";
    let statusText = status ? status.text() : "";

    // Match ZeistManga's metadata fallback for layouts that expose values in .y6x11p rows.
    root.querySelectorAll(".y6x11p").forEach(function (row) {
      const heading = row.querySelector("strong");
      const valueNode = row.querySelector("span.dt");
      const headingText = clean(heading ? heading.text() : row.text()).toLowerCase();
      const value = clean(valueNode ? valueNode.text() : "");
      if (!statusText && ["status", "estado", "الحالة"].some(function (word) { return headingText.includes(word); })) {
        statusText = value;
      }
      if (!authorText && ["author", "autor", "mangaka", "الكاتب", "yazar"].some(function (word) { return headingText.includes(word); })) {
        authorText = value;
      }
    });

    const titleNode = doc.querySelector("h1");
    const title = clean(entry.title && entry.title.$t) || clean(titleNode && titleNode.text());

    return {
      id: mangaUrl,
      title: title,
      cover: image ? absoluteUrl(image.attr("src"), mangaUrl) : getThumbnail(entry),
      description: description ? description.text() : undefined,
      altTitle: altTitle ? altTitle.text() : undefined,
      author: authorText || undefined,
      status: statusText ? parseStatus(statusText) : undefined,
      year: (title.match(/\b(19|20)\d{2}\b/) || [])[0]
        ? Number((title.match(/\b(19|20)\d{2}\b/) || [])[0])
        : undefined
    };
  },

  async chapters(id) {
    const mangaUrl = absoluteUrl(id, BASE);
    if (!mangaUrl) throw new Error("Comic Verse: invalid series URL");

    // Exact Mihon behavior: read the series page and take its [data-label] value.
    const seriesPage = await getDocumentResponse(mangaUrl);
    const labelNode = seriesPage.document.querySelector("[data-label]");
    const label = clean(labelNode && labelNode.attr("data-label"));
    if (!label) {
      throw new Error("Comic Verse: the series page has no [data-label] chapter-feed label");
    }

    const chapterFeed = resolveChapterFeed(seriesPage.body, label);
    const entries = await getAllChapterEntries(chapterFeed);
    return entries
      .filter(function (entry) { return hasLabel(entry, CHAPTER_CATEGORY); })
      .map(function (entry) {
        const title = clean(entry && entry.title && entry.title.$t);
        const url = getAlternateUrl(entry);
        if (!title || !url) return null;
        return {
          id: url,
          chapter: chapterNumber(title),
          title: title,
          pages: 0,
          language: "ar",
          publishAt: entry.published && entry.published.$t
            ? clean(entry.published.$t)
            : undefined
        };
      })
      .filter(Boolean);
  },

  async pageUrls(chapterId) {
    const url = absoluteUrl(chapterId, BASE);
    if (!url) throw new Error("Comic Verse: invalid chapter URL");

    // Mihon: GET the chapter as a document, select #cvOriginal, then img[src].
    // Harbor's parser removes CSS-hidden nodes, unlike Jsoup. Isolate the reader
    // element from raw HTML before parsing so its stylesheet cannot hide it.
    const response = await harbor.http(url, {
      responseType: "text",
      timeoutMs: 30000
    });
    if (!response || !response.ok) {
      throw new Error("Comic Verse: chapter page returned HTTP " +
        (response ? response.status : "unknown"));
    }

    const readerHtml = extractElementById(response.body || "", "cvOriginal");
    if (!readerHtml) {
      throw new Error("Comic Verse: #cvOriginal was not found in the chapter HTML");
    }

    const reader = await harbor.parseHtml(readerHtml);
    return reader.querySelectorAll("img[src]").map(function (image) {
      return absoluteUrl(image.attr("src"), url);
    }).filter(Boolean);
  }
};

harbor.register(plugin);
