/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Article {
  id: number;
  created_at: string;
  updated_at: string;
  slug: string;
  title: string;
  description: string | null;
  body: string;
  author_full_name: string | null;
  cover_img_src: string | null;
  cover_img_alt: string | null;
  is_active: boolean;
  published_date: string;
}

interface ApiResponse {
  articles: Article[];
}

interface Env {
  ARTICLES_KV: KVNamespace;
  API_SERVER_BASE_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/articles') {
      return fetchArticleList(env);
    } else if (url.pathname.startsWith('/articles/')) {
      const slug = url.pathname.split('/')[2]; // Assumes URL pattern is /articles/{slug}
      return fetchArticleBySlug(slug, env);
    } else if (url.pathname.startsWith('/update-kv')) {
      return updateKVStore(env);
    }
    return new Response('Invalid endpoint', { status: 404 });
  }
};

async function fetchArticlesFromAPI(env: Env): Promise<Article[]> {
  const response = await fetch(`${env.API_SERVER_BASE_URL}/api/articles`);
  const data = await response.json() as ApiResponse;
  return data.articles;
}

async function storeArticlesInKV(articles: Article[], env: Env): Promise<void> {
  const promises = articles.map(article =>
    env.ARTICLES_KV.put(`article-${article.slug}`, JSON.stringify(article))
  );
  await Promise.all(promises);
}

async function fetchArticleList(env: Env): Promise<Response> {
  const summary = await env.ARTICLES_KV.get('articles-summary');
  return new Response(summary, { headers: { 'content-type': 'application/json;charset=UTF-8' } });
}

async function fetchArticleBySlug(slug: string, env: Env): Promise<Response> {
  const article = await env.ARTICLES_KV.get(`article-${slug}`);
  return article ? new Response(article, { headers: { 'content-type': 'application/json;charset=UTF-8' } })
    : new Response('Article not found', { status: 404 });
}

async function storeArticleListSummary(articles: Article[], env: Env): Promise<void> {
  const summary = JSON.stringify(articles.map(article => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    description: article.description,
    cover_img_src: article.cover_img_src,
    cover_img_alt: article.cover_img_alt,
    published_date: article.published_date
  })));
  await env.ARTICLES_KV.put('articles-summary', summary);
}

async function updateKVStore(env: Env): Promise<Response> {
  try {
    const articles = await fetchArticlesFromAPI(env);
    await storeArticlesInKV(articles, env);
    await storeArticleListSummary(articles, env);
    return new Response('KV Store Updated', { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return new Response('Error updating KV Store: ' + error.message, { status: 500 });
    } else {
      return new Response('An unknown error occurred', { status: 500 });
    }
  }
}
