
import type {
  MangaChapter,
  MangaProvider,
  MangaSummary
} from '../../../shared/types/manga.js';

const BASE = 'https://arcomixverse.blogspot.com';
const FEED = `${BASE}/feeds/posts/default`;

interface BloggerEntry {
  title?: { $t: string };
  content?: { $t: string };
  published?: { $t: string };
  category?: { term: string }[];
  link?: { rel: string; href: string }[];
}

interface BloggerFeed {
  feed?: {
    entry?: BloggerEntry[];
  };
}

async function getFeed(path = ''): Promise<BloggerEntry[]> {
  const response = await harbor.http(
    `${FEED}${path}`,
    { responseType: 'json', timeoutMs: 30000 }
  );

  const data = response as BloggerFeed | null;

  if (!data?.feed) {
    throw new Error('Comic Verse: invalid Blogger feed');
  }

  return data.feed.entry || [];
}

function getPostUrl(entry: BloggerEntry): string {
  return entry.link?.find(link => link.rel === 'alternate')?.href || '';
}

function getLabels(entry: BloggerEntry): string[] {
  return (entry.category || []).map(category => category.term);
}

function getCover(entry: BloggerEntry): string | undefined {
  const html = entry.content?.$t || '';

  const match = html.match(
    /<img\b[^>]*?(?:src|data-src)=["']([^"']+)["']/i
  );

  return match?.[1]?.replace(/&amp;/g, '&');
}

function toSummary(entry: BloggerEntry): MangaSummary | null {
  const title = entry.title?.$t?.trim();

  if (!title) return null;

  const yearMatch = title.match(/\b(19|20)\d{2}\b/);

  return {
    id: title,
    title,
    cover: getCover(entry),
    year: yearMatch ? Number(yearMatch[0]) : undefined,
    status: getLabels(entry).includes('مستمر')
      ? 'Ongoing'
      : getLabels(entry).includes('مكتمل')
        ? 'Completed'
        : undefined,
    description: undefined
  };
}

function getChapterNumber(title: string): string | null {
  const match = title.match(
    /(?:العدد|#)\s*#?\s*(\d+(?:\.\d+)?)/i
  );

  return match?.[1] || null;
}

export const plugin: MangaProvider = {
  id: 'comic-verse',
  name: 'Comic Verse',

  async popular(offset: number): Promise<MangaSummary[]> {
    const entries = await getFeed(
      `/-/Series?alt=json&max-results=48&start-index=${offset + 1}`
    );

    return entries
      .filter(entry => getLabels(entry).includes('Series'))
      .map(toSummary)
      .filter((item): item is MangaSummary => item !== null);
  },

  async search(query: string, offset: number): Promise<MangaSummary[]> {
    const entries = await getFeed(
      `/-/Series?q=${encodeURIComponent(query)}&alt=json&max-results=48&start-index=${offset + 1}`
    );

    const normalized = query.toLowerCase();

    return entries
      .filter(entry => getLabels(entry).includes('Series'))
      .filter(entry =>
        (entry.title?.$t || '').toLowerCase().includes(normalized)
      )
      .map(toSummary)
      .filter((item): item is MangaSummary => item !== null);
  },

  async detail(id: string): Promise<MangaSummary | null> {
    const entries = await getFeed(
      `/-/Series?alt=json&max-results=500`
    );

    const entry = entries.find(
      item => item.title?.$t?.trim() === id
    );

    return entry ? toSummary(entry) : {
      id,
      title: id
    };
  },

  async chapters(id: string): Promise<MangaChapter[]> {
    const entries = await getFeed(
      `/-/${encodeURIComponent(id)}?alt=json&max-results=150`
    );

    return entries
      .filter(entry => getLabels(entry).includes('Chapter'))
      .map(entry => {
        const title = entry.title?.$t || '';
        const url = getPostUrl(entry);

        return {
          id: url,
          chapter: getChapterNumber(title),
          title,
          pages: 0,
          language: 'ar',
          publishAt: entry.published?.$t
        };
      })
      .filter(chapter => Boolean(chapter.id));
  },

  async pageUrls(chapterId: string): Promise<string[]> {
    const extractImages = (html: string): string[] => {
      const pages: string[] = [];
      const readerMarker = html.search(/id=["']cvOriginal["']/i);
      const readerHtml = readerMarker >= 0 ? html.slice(readerMarker) : html;
      const tags = readerHtml.match(/<(?:img|a)\b[^>]*>/gi) || [];
      for (const tag of tags) {
        const attrs = tag.matchAll(/(?:data-src|data-original|data-lazy-src|src|href)=["']([^"']+)["']/gi);
        for (const attr of attrs) {
          const url = attr[1].replace(/&amp;/g, '&').trim();
          if (!/^https?:\/\//i.test(url)) continue;
          if (!/(?:blogger\.googleusercontent\.com|bp\.blogspot\.com)/i.test(url)) continue;
          if (!pages.includes(url)) pages.push(url);
        }
      }
      return pages;
    };

    // Try the chapter page first.
    let pageError = '';
    try {
      const response = await harbor.http(chapterId, {
        responseType: 'text',
        timeoutMs: 30000
      });
      if (response.ok) {
        const pages = extractImages(response.body || '');
        if (pages.length) return pages;
        pageError = `chapter page had no reader images (HTTP ${response.status}, body ${(response.body || '').length} chars)`;
      } else {
        pageError = `chapter page returned HTTP ${response.status}`;
      }
    } catch (error) {
      pageError = String(error);
    }

    // Blogger's post feed contains the original post HTML and is a reliable
    // fallback when the rendered blog page is blocked or transformed.
    try {
      const entries = await getFeed('?alt=json&max-results=500');
      const normalize = (url: string) => url.replace(/\/$/, '').toLowerCase();
      const entry = entries.find(item =>
        item.link?.some(link => link.rel === 'alternate' && normalize(link.href) === normalize(chapterId))
      );
      if (entry?.content?.$t) {
        const pages = extractImages(entry.content.$t);
        if (pages.length) return pages;
        throw new Error('matching Blogger feed entry contains no reader images');
      }
      throw new Error('chapter URL not found in Blogger post feed');
    } catch (error) {
      throw new Error(`Comic Verse: ${pageError}; feed fallback: ${String(error)}`);
    }
  }
};

harbor.register(plugin);
