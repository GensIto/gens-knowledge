import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { Article, Highlight, HighlightSelector, Memo } from '../../../shared/contracts';
import { articles, highlights, memos } from '../infrastructure/schema';

export class ArticleRepository {
  private readonly db;
  constructor(binding: D1Database) {
    this.db = drizzle(binding);
  }
  list() {
    return this.db.select().from(articles).orderBy(desc(articles.savedAt)).all();
  }
  find(id: string) {
    return this.db.select().from(articles).where(eq(articles.id, id)).get();
  }
  findByUrl(url: string) {
    return this.db.select().from(articles).where(eq(articles.url, url)).get();
  }
  async reserve(article: Article) {
    const rows = await this.db
      .insert(articles)
      .values(article)
      .onConflictDoNothing({ target: articles.url })
      .returning();
    return rows[0];
  }
  async retry(id: string) {
    const rows = await this.db
      .update(articles)
      .set({ status: 'processing', error: null, savedAt: new Date().toISOString() })
      .where(and(eq(articles.id, id), eq(articles.status, 'failed')))
      .returning();
    return rows[0];
  }
  async update(id: string, values: Partial<Omit<Article, 'id' | 'url'>>) {
    await this.db.update(articles).set(values).where(eq(articles.id, id));
  }
  async highlights(articleId: string): Promise<Highlight[]> {
    const rows = await this.db
      .select()
      .from(highlights)
      .where(eq(highlights.articleId, articleId))
      .orderBy(highlights.createdAt);
    return rows.map(({ start, end, exact, prefix, suffix, ...row }) => ({
      ...row,
      position: { start, end },
      quote: { exact, prefix, suffix },
    }));
  }
  memos(articleId: string) {
    return this.db
      .select()
      .from(memos)
      .where(eq(memos.articleId, articleId))
      .orderBy(memos.createdAt)
      .all();
  }
  async addHighlight(articleId: string, input: HighlightSelector) {
    const highlight = {
      id: crypto.randomUUID(),
      articleId,
      createdAt: new Date().toISOString(),
      ...input,
    };
    await this.db.insert(highlights).values({
      id: highlight.id,
      articleId,
      createdAt: highlight.createdAt,
      ...input.position,
      ...input.quote,
    });
    return highlight;
  }
  async addMemo(articleId: string, highlightId: string | null, content: string) {
    const now = new Date().toISOString();
    const memo: Memo = {
      id: crypto.randomUUID(),
      articleId,
      highlightId,
      content,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(memos).values(memo);
    return memo;
  }
}
