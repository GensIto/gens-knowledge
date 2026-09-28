export type FetchedArticle = { html: string; url: string };
export interface ArticleFetcher {
  fetch(url: string): Promise<FetchedArticle>;
}
export type ExtractedArticle = {
  title: string | null;
  author: string | null;
  siteName: string | null;
  publishedAt: string | null;
  markdown: string;
};
export interface ArticleExtractor {
  extract(html: string, url: string): Promise<ExtractedArticle>;
}
