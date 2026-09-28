import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { ArticleRepository } from '../worker/src/repositories/article-repository';
import { ArticleService } from '../worker/src/services/article-service';
import { R2Storage } from '../worker/src/infrastructure/r2-storage';
import { AppError } from '../worker/src/domain/errors';

const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("test") } }',
    compatibilityDate: '2026-09-08',
    d1Databases: ['DB'],
    r2Buckets: ['ARTICLES'],
  }),
);
let env: Env;
beforeAll(async () => {
  env = await mf.getBindings<Env>();
  const sql = await readFile(
    new URL('../migrations/0000_friendly_gressill.sql', import.meta.url),
    'utf8',
  );
  await env.DB.batch(
    sql
      .split('--> statement-breakpoint')
      .filter((part) => part.trim())
      .map((part) => env.DB.prepare(part)),
  );
});
afterAll(async () => {
  await mf.dispose();
});

it('persists Markdown in R2, metadata and annotations in D1; deduplicates before fetching', async () => {
  let calls = 0;
  const repository = new ArticleRepository(env.DB);
  const service = new ArticleService(
    repository,
    new R2Storage(env.ARTICLES),
    {
      fetch: async (url) => {
        calls++;
        return { html: 'fixture', url };
      },
    },
    {
      extract: async () => ({
        title: 'Saved article',
        author: null,
        siteName: null,
        publishedAt: null,
        markdown: '# Saved article\n\nPersistent content.',
      }),
    },
  );
  const article = await service.save('https://example.com/persistence');
  expect(article.status).toBe('ready');
  const duplicate = await service.save('https://example.com/persistence#section');
  expect(duplicate.id).toBe(article.id);
  expect(calls).toBe(1);
  const highlight = await service.addHighlight(article.id, {
    position: { start: 0, end: 5 },
    quote: { exact: 'Saved', prefix: '', suffix: ' article' },
  });
  await service.addMemo(article.id, { highlightId: highlight.id, content: 'Remember this' });
  await service.addMemo(article.id, { content: 'Whole article note' });
  const detail = await service.detail(article.id);
  expect(detail.content).toContain('Persistent content.');
  expect(detail.highlights).toHaveLength(1);
  expect(detail.memos).toHaveLength(2);
  const another = await service.save('https://example.com/another');
  await expect(
    service.addMemo(another.id, { highlightId: highlight.id, content: 'Wrong article' }),
  ).rejects.toThrow('属していません');
});
it('marks failed imports and permits retry using the same article id', async () => {
  const repository = new ArticleRepository(env.DB);
  let fail = true;
  const service = new ArticleService(
    repository,
    new R2Storage(env.ARTICLES),
    {
      fetch: async (url) => {
        if (fail) throw new AppError('Temporary failure');
        return { html: 'fixture', url };
      },
    },
    {
      extract: async () => ({
        title: null,
        author: null,
        siteName: null,
        publishedAt: null,
        markdown: 'Recovered article',
      }),
    },
  );
  await expect(service.save('https://example.com/retry')).rejects.toThrow('Temporary failure');
  const failed = await repository.findByUrl('https://example.com/retry');
  expect(failed?.status).toBe('failed');
  fail = false;
  const ready = await service.save('https://example.com/retry');
  expect(ready.id).toBe(failed?.id);
  expect(ready.status).toBe('ready');
});
it('reserves a URL once under concurrent imports', async () => {
  let calls = 0;
  const service = new ArticleService(
    new ArticleRepository(env.DB),
    new R2Storage(env.ARTICLES),
    {
      fetch: async (url) => {
        calls++;
        return { html: 'fixture', url };
      },
    },
    {
      extract: async () => ({
        title: null,
        author: null,
        siteName: null,
        publishedAt: null,
        markdown: 'Concurrent article',
      }),
    },
  );
  const results = await Promise.all([
    service.save('https://example.com/concurrent'),
    service.save('https://example.com/concurrent'),
  ]);
  expect(results[0].id).toBe(results[1].id);
  expect(calls).toBe(1);
});
