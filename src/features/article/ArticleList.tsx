import type { PageProps } from '@hono/inertia';
import { Link } from '@inertiajs/react';

export function ArticleList({ articles }: Pick<PageProps<'Articles/Index'>, 'articles'>) {
  if (articles.length === 0) {
    return <p className="empty">まだ、ない。</p>;
  }

  return (
    <div className="article-list">
      {articles.map((article) => (
        <Link className="article-row" key={article.id} href={`/articles/${article.id}`}>
          <h2>{article.title || article.url}</h2>
          <span>
            {article.siteName || new URL(article.url).hostname}
            {article.status !== 'ready' && (
              <span className={`status ${article.status}`}>
                {' '}
                · {article.status === 'failed' ? '取得失敗' : '処理中'}
              </span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
