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

async function getDocument(url) {
  const response = await harbor.http(String(url), {
    responseType: "text",
    timeoutMs: 30000
  });
  if (!response || !response.ok) {
    throw new Error("Comic Verse: HTTP " + (response ? response.status : "unknown") + " while loading " + url);
  }
  return harbor.parseHtml(response.body || "");
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
    const titleNode = doc.querySelector("h1");
    const title = clean(titleNode && titleNode.text()) || clean(entry.title && entry.title.$t);

    return {
      id: mangaUrl,
      title: title,
      cover: image ? absoluteUrl(image.attr("src"), mangaUrl) : getThumbnail(entry),
      description: description ? description.text() : undefined,
      altTitle: altTitle ? altTitle.text() : undefined,
      author: author ? author.text() : undefined,
      status: status ? parseStatus(status.text()) : undefined,
      year: (title.match(/\b(19|20)\d{2}\b/) || [])[0]
        ? Number((title.match(/\b(19|20)\d{2}\b/) || [])[0])
        : undefined
    };
  },

  async chapters(id) {
    const mangaUrl = absoluteUrl(id, BASE);
    if (!mangaUrl) throw new Error("Comic Verse: invalid series URL");

    // Exact Mihon behavior: read the series page and take its [data-label] value.
    const doc = await getDocument(mangaUrl);
    const labelNode = doc.querySelector("[data-label]");
    const label = clean(labelNode && labelNode.attr("data-label"));
    if (!label) {
      throw new Error("Comic Verse: the series page has no [data-label] chapter-feed label");
    }

    const entries = await getAllChapterEntries(chapterFeedUrl(label));
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

    // Mihon's getPageList: GET the chapter document, then select #cvOriginal img[src].
    const response = await harbor.http(url, {
      responseType: "text",
      timeoutMs: 30000
    });
    if (!response || !response.ok) {
      throw new Error("Comic Verse: chapter page returned HTTP " +
        (response ? response.status : "unknown"));
    }

    const document = await harbor.parseHtml(response.body || "");
    const reader = document.querySelector("#cvOriginal");
    if (!reader) {
      throw new Error("Comic Verse: #cvOriginal was not found in the chapter document");
    }

    return reader.querySelectorAll("img[src]").map(function (image) {
      return absoluteUrl(image.attr("src"), url);
    }).filter(Boolean);
  }
};

harbor.register(plugin);
