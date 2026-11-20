
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
      const extractImages = html => {
        const pages = [];
        const seen = new Set();
        const marker = html.search(/id=["'](?:cvOriginal|cvPages)["']/i);
        const body = marker >= 0 ? html.slice(marker) : html;
        const imageLike = value =>
          /\.(?:avif|webp|png|jpe?g|gif|bmp|tiff?)(?:[?#]|$)/i.test(value) ||
          /\/(?:s\d{2,4}|w\d+-h\d+|s\d+-c)(?:\/|$)/i.test(value);
        const add = (raw, force = false) => {
          let value = raw.replace(/&amp;/gi, '&').replace(/&#38;/g, '&')
            .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").trim();
          value = value.replace(/^["']|["']$/g, '');
          if (!value || /^(?:data:|blob:|javascript:)/i.test(value)) return;
          if (value.startsWith('//')) value = 'https:' + value;
          try {
            const absolute = new URL(value, chapterId).href;
            if (!/^https?:\/\//i.test(absolute)) return;
            if (!force && !imageLike(absolute)) return;
            if (!seen.has(absolute)) { seen.add(absolute); pages.push(absolute); }
          } catch {}
        };
        const tags = body.match(/<(?:img|source|a)\b[^>]*>/gi) || [];
        for (const tag of tags) {
          const attrs = new Map();
          for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
            attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
          }
          const tagName = /^<\s*([a-z]+)/i.exec(tag)?.[1]?.toLowerCase();
          if (tagName === 'a') {
            const href = attrs.get('href');
            if (href) add(href);
            continue;
          }
          for (const key of ['data-original', 'data-src', 'data-lazy-src', 'data-echo', 'data-url', 'src', 'data-srcset', 'srcset']) {
            const value = attrs.get(key);
            if (!value) continue;
            if (key.includes('srcset')) {
              for (const candidate of value.split(',')) add(candidate.trim().split(/\s+/)[0], true);
            } else add(value, true);
          }
          const style = attrs.get('style') || '';
          for (const match of style.matchAll(/background-image\s*:\s*url\((?:"|')?([^)"']+)(?:"|')?\)/gi)) add(match[1], true);
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
          pageError = "chapter page had no image elements (HTTP " + response.status + ", body " + (response.body || '').length + " chars)";
        } else pageError = "chapter page returned HTTP " + response.status;
      } catch (error) { pageError = String(error); }

      try {
        const entries = await getFeed('?alt=json&max-results=500');
        const entry = entries.find(item =>
          item.link?.some(link => link.rel === 'alternate' && normalizePostUrl(link.href) === normalizePostUrl(chapterId))
        );
        if (entry?.content?.$t) {
          const pages = extractImages(entry.content.$t);
          if (pages.length) return pages;
          throw new Error('matching Blogger feed entry contains no image elements');
        }
        throw new Error('chapter URL not found in Blogger post feed');
      } catch (error) {
        throw new Error("Comic Verse: " + pageError + "; feed fallback: " + String(error));
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
