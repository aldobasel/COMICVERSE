
"use strict";

var plugin = (() => {
  const BASE = "https://arcomixverse.blogspot.com";
  const FEED = `${BASE}/feeds/posts/default`;

  async function getFeed(path = "") {
    const response = await harbor.http(
      `${FEED}${path}`,
      { responseType: "json", timeoutMs: 30000 }
    );

    if (!response?.feed) {
      throw new Error("Comic Verse: invalid Blogger feed");
    }

    return response.feed.entry || [];
  }

  function normalizePostUrl(raw) {
    try {
      const url = new URL(raw);
      return url.hostname.replace(/^www\./i, "").toLowerCase() + url.pathname.replace(/\/+$/, "").toLowerCase();
    } catch {
      return raw.replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
    }
  }

  const chapterHtmlCache = new Map();

  function getPostUrl(entry) {
    return entry.link?.find(link => link.rel === "alternate")?.href || "";
  }

  function getLabels(entry) {
    return (entry.category || []).map(category => category.term);
  }

  function getCover(entry) {
    const html = entry.content?.$t || "";

    const match = html.match(
      /<img\b[^>]*?(?:src|data-src)=["']([^"']+)["']/i
    );

    return match?.[1]?.replace(/&amp;/g, "&");
  }

  function toSummary(entry) {
    const title = entry.title?.$t?.trim();

    if (!title) return null;

    const yearMatch = title.match(/\b(19|20)\d{2}\b/);

    return {
      id: title,
      title,
      cover: getCover(entry),
      year: yearMatch ? Number(yearMatch[0]) : undefined,
      status: getLabels(entry).includes("مستمر")
        ? "Ongoing"
        : getLabels(entry).includes("مكتمل")
          ? "Completed"
          : undefined,
      description: undefined
    };
  }

  function getChapterNumber(title) {
    const match = title.match(
      /(?:العدد|#)\s*#?\s*(\d+(?:\.\d+)?)/i
    );

    return match?.[1] || null;
  }

  const mangaProvider = {
    id: "comic-verse",
    name: "Comic Verse",

    async popular(offset) {
      const entries = await getFeed(
        `/-/Series?alt=json&max-results=48&start-index=${offset + 1}`
      );

      return entries
        .filter(entry => getLabels(entry).includes("Series"))
        .map(toSummary)
        .filter(item => item !== null);
    },

    async search(query, offset) {
      const entries = await getFeed(
        `/-/Series?q=${encodeURIComponent(query)}&alt=json&max-results=48&start-index=${offset + 1}`
      );

      const normalized = query.toLowerCase();

      return entries
        .filter(entry => getLabels(entry).includes("Series"))
        .filter(entry =>
          (entry.title?.$t || "").toLowerCase().includes(normalized)
        )
        .map(toSummary)
        .filter(item => item !== null);
    },

    async detail(id) {
      const entries = await getFeed(
        "/-/Series?alt=json&max-results=500"
      );

      const entry = entries.find(
        item => item.title?.$t?.trim() === id
      );

      return entry ? toSummary(entry) : {
        id,
        title: id
      };
    },

    async chapters(id) {
      const entries = await getFeed(
        `/-/${encodeURIComponent(id)}?alt=json&max-results=150`
      );

      for (const entry of entries) {
        const url = getPostUrl(entry);
        const html = entry.content?.$t;
        if (url && html) {
          chapterHtmlCache.set(normalizePostUrl(url), html);
          if (chapterHtmlCache.size > 2000) {
            const oldest = chapterHtmlCache.keys().next().value;
            if (oldest) chapterHtmlCache.delete(oldest);
          }
        }
      }

      return entries
        .filter(entry => getLabels(entry).includes("Chapter"))
        .map(entry => {
          const title = entry.title?.$t || "";
          const url = getPostUrl(entry);

          return {
            id: url,
            chapter: getChapterNumber(title),
            title,
            pages: 0,
            language: "ar",
            publishAt: entry.published?.$t
          };
        })
        .filter(chapter => Boolean(chapter.id));
    },

    async pageUrls(chapterId) {
    // Match Mihon's Comic Verse extension exactly: #cvOriginal img[src].
      const extractImages = html => {
        const marker = html.search(/id\s*=\s*["']cvOriginal["']/i);
        if (marker < 0) return [];
        const readerHtml = html.slice(marker);
        const pages: string[] = [];
        const seen = new Set<string>();
        for (const tag of readerHtml.match(/<img\b[^>]*>/gi) || []) {
          const srcMatch = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
          const raw = srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? '';
          if (!raw) continue;
          let value = raw.replace(/&amp;/gi, '&').replace(/&#38;/g, '&')
            .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").trim();
          if (!value || /^(?:data:|blob:|javascript:)/i.test(value)) continue;
          if (value.startsWith('//')) value = 'https:' + value;
          try {
            const absolute = new URL(value, chapterId).href;
            if (!/^https?:\/\//i.test(absolute) || seen.has(absolute)) continue;
            seen.add(absolute);
            pages.push(absolute);
          } catch {}
        }
        return pages;
      };
      const cachedHtml = chapterHtmlCache.get(normalizePostUrl(chapterId));
      if (cachedHtml) {
        const cachedPages = extractImages(cachedHtml);
        if (cachedPages.length) return cachedPages;
    }
      let pageError = '';
      try {
      const response = await harbor.http(chapterId, { responseType: 'text', timeoutMs: 30000 });
      if (response.ok) {
        const pages = extractImages(response.body || '');
        if (pages.length) return pages;
        pageError = `chapter page has no #cvOriginal img[src] (HTTP ${response.status})`;
        } else pageError = `chapter page returned HTTP ${response.status}`;
      } catch (error) {
      pageError = String(error);
    }
      // Mihon resolves Blogger posts by exact permalink path, not a limited recent-post scan.
      try {
        const postPath = new URL(chapterId).pathname;
        const entries = await getFeed(`?path=${encodeURIComponent(postPath)}&alt=json`);
        const entry = entries.find(item =>
        item.link?.some(link => link.rel === 'alternate' &&
          normalizePostUrl(link.href) === normalizePostUrl(chapterId))
      ) || entries[0];
        if (!entry?.content?.$t) throw new Error('Blogger path feed returned no matching post content');
        const pages = extractImages(entry.content.$t);
        if (pages.length) return pages;
        throw new Error('Blogger post content has no #cvOriginal img[src] elements');
      } catch (error) {
        throw new Error(`Comic Verse: ${pageError}; exact-path feed fallback: ${String(error)}`);
    }
    }
  };

  return { plugin: mangaProvider };
})();

if (
  typeof plugin !== "undefined" &&
  typeof harbor !== "undefined" &&
  harbor.register
) {
  const provider = plugin?.default || plugin?.plugin || plugin;

  if (provider && provider.id && provider.name) {
    try {
      harbor.register(provider);
    } catch (_) {}
  }
}
