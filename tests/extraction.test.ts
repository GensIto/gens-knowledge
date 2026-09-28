import { expect, it } from 'vitest';
import { DefuddleArticleExtractor } from '../worker/src/infrastructure/defuddle-extractor';
export const fixture =
  '<!DOCTYPE html><html><head><title>読むことと記憶</title><meta name="author" content="栞編集部"></head><body><nav>不要なナビゲーション</nav><main><article><h1>読むことと記憶</h1><p>読みたい記事を手元に残すと、必要なときにもう一度開くことができます。心に留まった言葉を選び、自分の言葉でメモを書くことで、読んだことが知識につながります。</p><h2>小さな習慣から</h2><p>一度にすべてを覚える必要はありません。気になった部分を少しずつ読み直し、前に書いたメモと今の考えを比べてみましょう。</p><script>alert("bad")</script></article></main></body></html>';
it('extracts article Markdown and metadata without scripts/navigation', async () => {
  const result = await new DefuddleArticleExtractor().extract(
    fixture,
    'https://example.com/article',
  );
  expect(result.title).toBe('読むことと記憶');
  expect(result.markdown).toContain('小さな習慣から');
  expect(result.markdown).not.toContain('alert(');
  expect(result.markdown).not.toContain('不要なナビゲーション');
});
