
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
      const response = await harbor.http(chapterId, {
        responseType: "text",
        timeoutMs: 30000
      });

      if (!response.ok) {
        throw new Error(`Comic Verse: HTTP ${response.status}`);
      }

      const html = response.body || "";
      const marker = html.search(/id=["']cvOriginal["']/i);
      const readerHtml = marker >= 0 ? html.slice(marker) : html;
      const tags = readerHtml.match(/<img\b[^>]*>/gi) || [];
      const pages = [];

      for (const tag of tags) {
        const match = tag.match(
          /(?:data-src|data-original|data-lazy-src|src)=["']([^"']+)["']/i
        );

        if (!match) continue;

        let url = match[1].replace(/&amp;/g, "&").trim();
        if (!url || url.startsWith("data:")) continue;

        try {
          url = new URL(url, chapterId).href;
        } catch (_) {
          continue;
        }

        // Keep actual reader images; do not assume that every comic numbers files the same way.
        const isImage = /\.(?:jpe?g|png|webp|gif)(?:[?#]|$)/i.test(url);
        const isBloggerImage = /(?:blogger\.googleusercontent\.com|bp\.blogspot\.com)/i.test(url);

        if (!isImage && !isBloggerImage) continue;

        if (!pages.includes(url)) {
          pages.push(url);
        }
      }

      if (pages.length === 0) {
        throw new Error(
          "Comic Verse: no reader images found in this chapter"
        );
      }

      return pages;
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
