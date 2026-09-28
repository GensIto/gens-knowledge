import { DefuddleArticleExtractor } from '../infrastructure/defuddle-extractor';
import { HttpArticleFetcher } from '../infrastructure/http-fetcher';
import { R2Storage } from '../infrastructure/r2-storage';
import { ArticleRepository } from '../repositories/article-repository';
import { PostRepository } from '../repositories/post-repository';
import { ArticleService } from './article-service';
import { PostService } from './post-service';

export function createService(env: Env) {
  return new ArticleService(
    new ArticleRepository(env.DB),
    new R2Storage(env.ARTICLES),
    new HttpArticleFetcher(),
    new DefuddleArticleExtractor(),
  );
}

export function createPostService(env: Env) {
  return new PostService(new PostRepository(env.DB));
}
