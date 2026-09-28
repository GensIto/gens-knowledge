import { z } from 'zod';

export const articleInput = z.object({
  url: z
    .url()
    .max(2048)
    .refine((value) => /^https?:\/\//i.test(value), 'HTTP / HTTPS のURLを入力してください'),
});
export const highlightInput = z
  .object({
    position: z.object({ start: z.number().int().min(0), end: z.number().int().min(1) }),
    quote: z.object({
      exact: z.string().min(1).max(10000),
      prefix: z.string().max(64),
      suffix: z.string().max(64),
    }),
  })
  .refine(
    (value) =>
      value.position.end > value.position.start &&
      value.position.end - value.position.start === value.quote.exact.length,
    '選択範囲が不正です',
  );
export const postInput = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください').max(120, 'タイトルは120文字までです'),
  content: z.string().max(100_000, '本文は10万文字までです'),
});
export const memoInput = z.object({
  highlightId: z.uuid().nullable().default(null),
  content: z.string().trim().min(1).max(10000),
});
export type HighlightSelector = z.infer<typeof highlightInput>;
export type Article = {
  id: string;
  url: string;
  title: string | null;
  author: string | null;
  siteName: string | null;
  publishedAt: string | null;
  savedAt: string;
  contentKey: string | null;
  status: 'processing' | 'ready' | 'failed';
  extractor: string | null;
  error: string | null;
};
export type Highlight = HighlightSelector & { id: string; articleId: string; createdAt: string };
export type Memo = {
  id: string;
  articleId: string;
  highlightId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};
export type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};
export type PostSummary = Omit<Post, 'content'>;
export type ArticleDetail = {
  article: Article;
  content: string;
  highlights: Highlight[];
  memos: Memo[];
};
