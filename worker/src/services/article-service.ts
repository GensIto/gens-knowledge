import type { Article, ArticleDetail } from '../../../shared/contracts';
import { highlightInput, memoInput } from '../../../shared/contracts';
import { AppError } from '../domain/errors';
import type { ArticleExtractor, ArticleFetcher } from '../domain/extraction';
import { publicUrl } from '../infrastructure/public-url';
import type { R2Storage } from '../infrastructure/r2-storage';
import type { ArticleRepository } from '../repositories/article-repository';

export class ArticleService {
  constructor(
    private readonly repository: ArticleRepository,
    private readonly storage: R2Storage,
    private readonly fetcher: ArticleFetcher,
    private readonly extractor: ArticleExtractor,
  ) {}
  list() {
    return this.repository.list();
  }
  async save(input: string): Promise<Article> {
    const url = publicUrl(input).href;
    const existing = await this.repository.findByUrl(url);

    if (existing && existing.status !== 'failed') return existing;

    const id = existing?.id ?? crypto.randomUUID();

    const reserved = existing
      ? await this.repository.retry(id)
      : await this.repository.reserve({
          id,
          url,
          title: null,
          author: null,
          siteName: null,
          publishedAt: null,
          savedAt: new Date().toISOString(),
          contentKey: null,
          status: 'processing',
          extractor: null,
          error: null,
        });
    if (!reserved) {
      const concurrent = await this.repository.findByUrl(url);
      if (!concurrent) throw new AppError('記事を保存できませんでした。再試行してください', 409);
      return concurrent;
    }
    try {
      const fetched = await this.fetcher.fetch(url);
      const { markdown, ...metadata } = await this.extractor.extract(fetched.html, fetched.url);
      const contentKey = `articles/${id}/article.md`;

      await this.storage.put(contentKey, markdown);
      await this.repository.update(id, {
        ...metadata,
        contentKey,
        status: 'ready',
        extractor: 'defuddle',
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : '記事を取得できませんでした。時間をおいて再試行してください';
      await this.repository.update(id, { status: 'failed', error: message });
      console.error(
        JSON.stringify({
          event: 'article_import_failed',
          articleId: id,
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
      throw new AppError(message, 422);
    }
    return this.require(id);
  }
  async require(id: string) {
    const article = await this.repository.find(id);
    if (!article) throw new AppError('記事が見つかりません', 404);
    return article;
  }
  async detail(id: string): Promise<ArticleDetail> {
    const article = await this.require(id);
    const [content, highlights, memos] = await Promise.all([
      article.contentKey ? this.storage.get(article.contentKey) : Promise.resolve(''),
      this.repository.highlights(id),
      this.repository.memos(id),
    ]);
    if (article.status === 'ready' && content === null)
      throw new AppError('保存済み本文が見つかりません', 502);
    return { article, content: content ?? '', highlights, memos };
  }
  async addHighlight(id: string, input: unknown) {
    const article = await this.require(id);
    if (article.status !== 'ready') throw new AppError('本文の保存が完了していません', 409);
    return this.repository.addHighlight(id, highlightInput.parse(input));
  }
  async addMemo(id: string, input: unknown) {
    const article = await this.require(id);
    if (article.status !== 'ready') throw new AppError('本文の保存が完了していません', 409);
    const data = memoInput.parse(input);
    if (
      data.highlightId &&
      !(await this.repository.highlights(id)).some((highlight) => highlight.id === data.highlightId)
    )
      throw new AppError('このハイライトは記事に属していません');
    return this.repository.addMemo(id, data.highlightId, data.content);
  }
}
