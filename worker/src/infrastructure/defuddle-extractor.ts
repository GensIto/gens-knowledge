import { Defuddle } from 'defuddle/node';
import type { ArticleExtractor, ExtractedArticle } from '../domain/extraction';
import { AppError } from '../domain/errors';

export class DefuddleArticleExtractor implements ArticleExtractor {
  async extract(html: string, url: string): Promise<ExtractedArticle> {
    const result = await Defuddle(html, url, { markdown: true, useAsync: false });
    const markdown = result.content.trim();

    if (markdown.length < 40) {
      throw new AppError('記事本文を抽出できませんでした。通常のHTML記事をお試しください', 422);
    }

    return {
      title: result.title || null,
      author: result.author || null,
      siteName: result.site || null,
      publishedAt: result.published || null,
      markdown,
    };
  }
}
