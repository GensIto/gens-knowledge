import { serializePage, type RootView } from '@hono/inertia';
import { renderToString } from 'react-dom/server';
import { Link, Script, ViteClient } from 'vite-ssr-components/react';

export const rootView: RootView = (page) =>
  '<!DOCTYPE html>' +
  renderToString(
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="referrer" content="same-origin" />
        <title>gens</title>
        <ViteClient />
        <Script src="/src/client.tsx" />
        <Link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>
        <script
          data-page="app"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: serializePage(page) }}
        />
        <div id="app" />
      </body>
    </html>,
  );
