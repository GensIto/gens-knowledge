import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const posts = sqliteTable(
  'posts',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    content: text().notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('posts_updated_at').on(table.updatedAt)],
);

export const articles = sqliteTable(
  'articles',
  {
    id: text().primaryKey(),
    url: text().notNull().unique(),
    title: text(),
    author: text(),
    siteName: text('site_name'),
    publishedAt: text('published_at'),
    savedAt: text('saved_at').notNull(),
    contentKey: text('content_key'),
    status: text({ enum: ['processing', 'ready', 'failed'] }).notNull(),
    extractor: text(),
    error: text(),
  },
  (table) => [index('articles_saved_at').on(table.savedAt)],
);

export const highlights = sqliteTable(
  'highlights',
  {
    id: text().primaryKey(),
    articleId: text('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    start: integer('start_position').notNull(),
    end: integer('end_position').notNull(),
    exact: text('exact_text').notNull(),
    prefix: text('prefix_text').notNull(),
    suffix: text('suffix_text').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('highlights_article').on(table.articleId),
    uniqueIndex('highlights_id_article').on(table.id, table.articleId),
  ],
);

export const memos = sqliteTable(
  'memos',
  {
    id: text().primaryKey(),
    articleId: text('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    highlightId: text('highlight_id').references(() => highlights.id, { onDelete: 'cascade' }),
    content: text().notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('memos_article').on(table.articleId)],
);
