import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

void createInertiaApp({
  resolve: async (name) => {
    const pages = import.meta.glob<{ default: ResolvedComponent }>('./pages/**/*.tsx');
    const load = pages[`./pages/${name}.tsx`];
    if (!load) throw new Error(`Unknown page: ${name}`);
    return (await load()).default;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
  progress: { color: '#50664a' },
});
