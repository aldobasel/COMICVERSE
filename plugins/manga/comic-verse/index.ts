
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
    const response = await harbor.http(chapterId, {
      responseType: 'text',
      timeoutMs: 30000
    });

    if (!response.ok) {
      throw new Error(`Comic Verse: HTTP ${response.status}`);
    }

    const html = response.body;
    const tags = html.match(/<img\b[^>]*>/gi) || [];
    const pages: string[] = [];

    for (const tag of tags) {
      const match = tag.match(
        /(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/i
      );

      if (!match) continue;

      const url = match[1].replace(/&amp;/g, '&');

      // Supports 000.jpg, 001a.jpg and P00001.jpg
      if (!/\/(?:P?\d+[a-z]?)\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(url)) {
        continue;
      }

      if (!pages.includes(url)) {
        pages.push(url);
      }
    }

    if (pages.length === 0) {
      throw new Error(
        'Comic Verse: no comic pages found in this chapter'
      );
    }

    return pages;
  }
};

harbor.register(plugin);
