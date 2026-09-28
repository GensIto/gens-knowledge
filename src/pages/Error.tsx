import { Link } from '@inertiajs/react';
import { Layout } from '@/components/Layout';

export default function ErrorPage({ message, status }: { message: string; status: number }) {
  return (
    <Layout>
      <section className="empty">
        <p className="eyebrow">{status}</p>
        <h1>{message}</h1>
        <Link href="/">読みもの棚へ戻る</Link>
      </section>
    </Layout>
  );
}
