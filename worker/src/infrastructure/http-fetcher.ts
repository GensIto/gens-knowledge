import { resolve4, resolve6 } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import type { ArticleFetcher, FetchedArticle } from '../domain/extraction';
import { AppError } from '../domain/errors';
import { publicUrl } from './public-url';

export class HttpArticleFetcher implements ArticleFetcher {
  async fetch(input: string): Promise<FetchedArticle> {
    let url = publicUrl(input);
    const signal = AbortSignal.timeout(20_000);

    for (let hop = 0; hop <= 5; hop++) {
      if (!ipaddr.isValid(url.hostname)) {
        const answers = await Promise.allSettled([resolve4(url.hostname), resolve6(url.hostname)]);
        const addresses = answers.flatMap((result) =>
          result.status === 'fulfilled' ? result.value : [],
        );
        if (
          !addresses.length ||
          addresses.some((address) => ipaddr.process(address).range() !== 'unicast')
        ) {
          throw new AppError('公開IPアドレスを確認できないURLです', 422);
        }
      }

      const response = await fetch(url, {
        redirect: 'manual',
        signal,
        headers: {
          Accept: 'text/html, application/xhtml+xml',
          'User-Agent': 'GensKnowledge/0.1 (Article reader)',
        },
      });

      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) throw new AppError('リダイレクト先がありません', 422);

        url = publicUrl(new URL(location, url).href);
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new AppError(`記事の取得に失敗しました（HTTP ${response.status}）`, 422);
      }

      if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') ?? '')) {
        await response.body?.cancel();
        throw new AppError('HTML記事のURLを指定してください', 422);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new AppError('本文が空です', 422);

      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          size += value.byteLength;
          if (size > 2_000_000) {
            await reader.cancel();
            throw new AppError('記事サイズが2MBを超えています', 413);
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const charset =
        response.headers.get('content-type')?.match(/charset=["']?([^\s;"']+)/i)?.[1] ?? 'utf-8';
      let decoder: TextDecoder;
      try {
        decoder = new TextDecoder(charset);
      } catch {
        decoder = new TextDecoder();
      }
      return { html: decoder.decode(bytes), url: url.href };
    }
    throw new AppError('リダイレクト回数が上限を超えました', 422);
  }
}
