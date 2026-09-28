import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PostEditor } from '@/features/post/PostEditor';
import type { PageProps } from '@/pages.gen';

export default function Edit({ post, errors }: PageProps<'Posts/Edit'>) {
  const form = useForm({ title: post?.title ?? '', content: post?.content ?? '' });
  const [confirming, setConfirming] = useState(false);
  const action = post ? `/posts/${post.id}` : '/posts';

  return (
    <Layout>
      <Head title={post ? post.title : '書きはじめる'} />
      <nav className="editor-nav" aria-label="書いたものの操作">
        <Link href="/">← 戻る</Link>
      </nav>
      <form
        className="writing-page"
        onSubmit={(event) => {
          event.preventDefault();
          form.post(action);
        }}
      >
        <div className="field">
          <label className="sr-only" htmlFor="post-title">
            タイトル
          </label>
          <input
            id="post-title"
            className="title-input"
            name="title"
            value={form.data.title}
            required
            maxLength={120}
            autoComplete="off"
            placeholder="タイトル"
            aria-describedby={errors.title ? 'title-error' : undefined}
            onChange={(event) => form.setData('title', event.target.value)}
          />
          {errors.title && (
            <p className="error" id="title-error" role="alert">
              {errors.title}
            </p>
          )}
        </div>
        <p className="sr-only" id="post-body-label">
          本文
        </p>
        <PostEditor
          key={post?.id ?? 'new'}
          content={post?.content ?? ''}
          onChange={(markdown) => form.setData('content', markdown)}
        />
        {errors.content && (
          <p className="error" role="alert">
            {errors.content}
          </p>
        )}
        {errors.form && (
          <p className="error" role="alert">
            {errors.form}
          </p>
        )}
        <div className="editor-actions">
          <button className="primary" type="submit" disabled={form.processing}>
            {form.processing ? '置いている…' : '置く'}
          </button>
          {post && !confirming && (
            <button type="button" className="text-button" onClick={() => setConfirming(true)}>
              削除
            </button>
          )}
          {post && confirming && (
            <>
              <button type="button" className="text-button" onClick={() => setConfirming(false)}>
                キャンセル
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => router.post(`/posts/${post.id}/delete`, {})}
              >
                削除する
              </button>
            </>
          )}
        </div>
      </form>
    </Layout>
  );
}
