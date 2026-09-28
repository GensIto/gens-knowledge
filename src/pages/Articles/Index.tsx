import { Head, Link, useForm } from '@inertiajs/react';
import { Button, Input, Label, TextField } from 'react-aria-components';
import { Layout } from '@/components/Layout';
import type { PageProps } from '@/pages.gen';
import { ArticleList } from '@/features/article/ArticleList';

export default function Index({ articles, posts, errors }: PageProps<'Articles/Index'>) {
  const form = useForm({ url: '' });
  return (
    <Layout>
      <Head title="gens" />
      <section className="object-shelf" aria-label="残したもの">
      <h1 className="library-title">残したもの</h1>
      <form
        className="save-panel"
        onSubmit={(event) => {
          event.preventDefault();
          form.post('/articles');
        }}
      >
        <TextField
          className="url-field"
          type="url"
          isRequired
          value={form.data.url}
          onChange={(value) => form.setData('url', value)}
          isDisabled={form.processing}
        >
          <Label className="sr-only">残したいURL</Label>
          <Input
            placeholder="残したいURL"
            aria-describedby={errors.url ? 'url-error' : undefined}
          />
        </TextField>
        <Button className="primary" type="submit" isDisabled={form.processing}>
          {form.processing ? '残している…' : '残す'}
        </Button>
        {errors.url && (
          <p className="error" role="alert" id="url-error">
            {errors.url}
          </p>
        )}
      </form>
      <ArticleList articles={articles} />
      </section>
      <section className="object-shelf" aria-label="書いたもの">
        <div className="library-heading">
          <h2 className="library-title">書いたもの</h2>
          <Link className="primary" href="/posts/new">
            書く
          </Link>
        </div>
        {posts.length === 0 ? (
          <p className="empty">まだ、ない。</p>
        ) : (
          <div className="article-list">
            {posts.map((post) => (
              <Link className="article-row" key={post.id} href={`/posts/${post.id}/edit`}>
                <h2>{post.title}</h2>
                <span>
                  {new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(
                    new Date(post.updatedAt),
                  )}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
