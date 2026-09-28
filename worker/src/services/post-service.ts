import { postInput, type Post } from '../../../shared/contracts';
import { AppError } from '../domain/errors';
import type { PostRepository } from '../repositories/post-repository';

export class PostService {
  constructor(private readonly repository: PostRepository) {}
  list() {
    return this.repository.list();
  }
  find(id: string) {
    return this.repository.find(id);
  }
  create(input: unknown) {
    return this.repository.create(postInput.parse(input));
  }
  async update(id: string, input: unknown) {
    await this.require(id);
    const data = postInput.parse(input);
    await this.repository.update(id, data);
    return this.require(id);
  }
  async remove(id: string) {
    await this.require(id);
    await this.repository.remove(id);
  }
  async require(id: string): Promise<Post> {
    const post = await this.repository.find(id);
    if (!post) throw new AppError('記事が見つかりません', 404);
    return post;
  }
}
