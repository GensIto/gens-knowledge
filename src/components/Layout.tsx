import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="library-view">
      <header className="site-header">
        <Link href="/" className="brand">
          gens
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
