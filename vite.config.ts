import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { inertiaPages } from '@hono/inertia/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import ssrPlugin from 'vite-ssr-components/plugin';

export default defineConfig({
  ssr: { external: ['mermaid'] },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  plugins: [
    inertiaPages({
      pagesDir: 'src/pages',
      outFile: 'src/pages.gen.ts',
      serverModule: '../worker/src/index',
    }),
    cloudflare(),
    ssrPlugin({ entry: { target: 'worker/src/root-view.tsx' } }),
    tailwindcss(),
  ],
});
