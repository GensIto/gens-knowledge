import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { Post, PostSummary } from '../../../shared/contracts';
import { posts } from '../infrastructure/schema';

export class PostRepository {
  private readonly db;
  constructor(binding: D1Database) {
    this.db = drizzle(binding);
  }
  list(): Promise<PostSummary[]> {
    return this.db
      .select({
        id: posts.id,
        title: posts.title,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .orderBy(desc(posts.updatedAt))
      .all();
  }
  find(id: string) {
    return this.db.select().from(posts).where(eq(posts.id, id)).get();
  }
  async create(input: Pick<Post, 'title' | 'content'>) {
    const now = new Date().toISOString();
    const post: Post = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...input };
    await this.db.insert(posts).values(post);
    return post;
  }
  async update(id: string, input: Pick<Post, 'title' | 'content'>) {
    await this.db
      .update(posts)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(posts.id, id));
  }
  async remove(id: string) {
    await this.db.delete(posts).where(eq(posts.id, id));
  }
}
