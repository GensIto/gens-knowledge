import { inertia } from '@hono/inertia';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { ZodError } from 'zod';
import { articleInput, type Post } from '../../shared/contracts';
import { AppError } from './domain/errors';
import { rootView } from './root-view';
import { createPostService, createService } from './services/create-service';

const app = new Hono<{ Bindings: Env }>();

app
  .use('*', async (c, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const origin = c.req.header('Origin');
      if (origin && origin !== new URL(c.req.url).origin) {
        return c.json({ error: '異なるサイトからの送信はできません' }, 403);
      }
      if (!c.req.header('Content-Type')?.includes('application/json')) {
        return c.json({ error: 'JSONで送信してください' }, 415);
      }
    }
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'same-origin');
    c.header('Cache-Control', 'no-store');
  })
  .use('*', (c, next) => {
    const writing = c.req.method === 'POST' && new URL(c.req.url).pathname.startsWith('/posts');
    return bodyLimit({ maxSize: writing ? 512 * 1024 : 64 * 1024 })(c, next);
  })
  .use('*', inertia({ rootView }));

function postErrors(error: unknown) {
  if (error instanceof ZodError) {
    const errors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = typeof issue.path[0] === 'string' ? issue.path[0] : 'form';
      errors[key] ??= issue.message;
    }
    return errors;
  }
  if (error instanceof AppError) return { form: error.message };
  throw error;
}

const blankPost: Post | null = null;

function message(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message ?? '入力値を確認してください';
  if (error instanceof AppError) return error.message;
  throw error;
}

const routes = app
  .get('/api/health', (c) => c.json({ ok: true }))
  .get('/', async (c) => {
    const [articles, posts] = await Promise.all([
      createService(c.env).list(),
      createPostService(c.env).list(),
    ]);
    return c.render('Articles/Index', { articles, posts, errors: {} as Record<string, string> });
  })
  .post('/articles', async (c) => {
    const service = createService(c.env);
    try {
      const { url } = articleInput.parse(await c.req.json());
      const article = await service.save(url);
      return c.redirect(`/articles/${article.id}`, 303);
    } catch (error) {
      const [articles, posts] = await Promise.all([
        service.list(),
        createPostService(c.env).list(),
      ]);
      return c.render(
        'Articles/Index',
        { articles, posts, errors: { url: message(error) } as Record<string, string> },
        { url: '/' },
      );
    }
  })
  .get('/articles/:id', async (c) =>
    c.render('Articles/Show', {
      ...(await createService(c.env).detail(c.req.param('id'))),
      errors: {} as Record<string, string>,
    }),
  )
  .post('/articles/:id/highlights', async (c) => {
    const service = createService(c.env);
    const id = c.req.param('id');
    try {
      await service.addHighlight(id, await c.req.json());
      return c.redirect(`/articles/${id}`, 303);
    } catch (error) {
      return c.render(
        'Articles/Show',
        {
          ...(await service.detail(id)),
          errors: { highlight: message(error) } as Record<string, string>,
        },
        { url: `/articles/${id}` },
      );
    }
  })
  .get('/posts', (c) => c.redirect('/', 302))
  .get('/posts/new', (c) =>
    c.render('Posts/Edit', { post: blankPost, errors: {} as Record<string, string> }),
  )
  .post('/posts', async (c) => {
    try {
      const post = await createPostService(c.env).create(await c.req.json());
      return c.redirect(`/posts/${post.id}/edit`, 303);
    } catch (error) {
      return c.render(
        'Posts/Edit',
        { post: blankPost, errors: postErrors(error) },
        { url: '/posts/new' },
      );
    }
  })
  .get('/posts/:id/edit', async (c) => {
    const post = await createPostService(c.env).require(c.req.param('id'));
    return c.render('Posts/Edit', { post, errors: {} as Record<string, string> });
  })
  .post('/posts/:id/delete', async (c) => {
    await createPostService(c.env).remove(c.req.param('id'));
    return c.redirect('/posts', 303);
  })
  .get('/posts/:id', (c) => c.redirect(`/posts/${c.req.param('id')}/edit`, 302))
  .post('/posts/:id', async (c) => {
    const service = createPostService(c.env);
    const id = c.req.param('id');
    try {
      const post = await service.update(id, await c.req.json());
      return c.redirect(`/posts/${post.id}/edit`, 303);
    } catch (error) {
      if (error instanceof AppError && error.status === 404) throw error;
      const post = await service.find(id);
      if (!post) throw error;
      return c.render(
        'Posts/Edit',
        { post, errors: postErrors(error) },
        { url: `/posts/${id}/edit` },
      );
    }
  })
  .post('/articles/:id/memos', async (c) => {
    const service = createService(c.env);
    const id = c.req.param('id');
    try {
      await service.addMemo(id, await c.req.json());
      return c.redirect(`/articles/${id}`, 303);
    } catch (error) {
      return c.render(
        'Articles/Show',
        {
          ...(await service.detail(id)),
          errors: { content: message(error) } as Record<string, string>,
        },
        { url: `/articles/${id}` },
      );
    }
  });

routes.onError((error, c) => {
  if (error instanceof SyntaxError) return c.json({ error: 'JSONが不正です' }, 400);

  const status = error instanceof AppError ? error.status : 500;

  if (status === 500) {
    console.error(JSON.stringify({ event: 'request_failed', error: error.message }));
  }

  c.status(status);
  return c.render('Error', {
    message: status === 500 ? '処理に失敗しました。もう一度お試しください' : error.message,
    status,
  });
});

routes.all('*', (c) => {
  c.status(404);
  return c.render('Error', { message: 'ページが見つかりません', status: 404 });
});

export default routes;
