import { readdir, readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { PostRepository } from '../worker/src/repositories/post-repository';
import { PostService } from '../worker/src/services/post-service';

const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("test") } }',
    compatibilityDate: '2026-09-08',
    d1Databases: ['DB'],
  }),
);
let service: PostService;
beforeAll(async () => {
  const env = await mf.getBindings<Env>();
  const dir = new URL('../migrations/', import.meta.url);
  const statements = [];
  for (const name of (await readdir(dir)).filter((entry) => entry.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(name, dir), 'utf8');
    for (const part of sql.split('--> statement-breakpoint')) {
      if (part.trim()) statements.push(env.DB.prepare(part));
    }
  }
  await env.DB.batch(statements);
  service = new PostService(new PostRepository(env.DB));
});
afterAll(async () => {
  await mf.dispose();
});

it('saves, lists, updates, and deletes an authored post', async () => {
  const created = await service.create({
    title: '自分の記事',
    content: '# こんにちは\n\n```ts\nconst n = 1\n```\n\n```mermaid\nflowchart LR\n  A --> B\n```',
  });
  expect(created.title).toBe('自分の記事');
  const found = await service.require(created.id);
  expect(found.content).toContain('flowchart');
  await service.update(created.id, { title: '直した記事', content: '更新後' });
  const posts = await service.list();
  expect(posts[0]).toMatchObject({ id: created.id, title: '直した記事' });
  expect(posts[0]).not.toHaveProperty('content');
  await service.remove(created.id);
  await expect(service.require(created.id)).rejects.toThrow('見つかりません');
});

it('rejects a post without a title', async () => {
  expect.assertions(2);
  try {
    await service.create({ title: '   ', content: '' });
  } catch (error) {
    expect(error).toBeInstanceOf(ZodError);
    expect(error instanceof ZodError && error.issues[0]?.message).toBe('タイトルを入力してください');
  }
});
