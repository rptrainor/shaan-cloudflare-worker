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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/articles') {
      return fetchArticleList(env);
    }

    if (url.pathname.startsWith('/articles/')) {
      const slug = url.pathname.split('/')[2]; // Assumes URL pattern is /articles/{slug}
      return fetchArticleBySlug(slug, env);
    }

    if (url.pathname.startsWith('/update-kv')) {
      return updateKVStore(env);
    }

    return new Response('Invalid endpoint', { status: 404 });
  }
};

async function fetchArticlesFromAPI(env: Env): Promise<Article[]> {
  try {
    const response = await fetch(`${env.API_SERVER_BASE_URL}/api/articles`);
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    const data = await response.json() as ApiResponse;
    return data.articles;
  } catch (error) {
    console.error('Failed to fetch articles from API:', error);
    throw error;  // Re-throw to handle it in the calling function
  }
}

async function storeArticlesInKV(articles: Article[], env: Env): Promise<void> {
  try {
    const promises = articles.map(article =>
      env.ARTICLES_KV.put(`article-${article.slug}`, JSON.stringify(article))
    );
    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to store articles in KV:', error);
    throw error;  // Re-throw to handle it in the calling function
  }
}

async function fetchArticleList(env: Env): Promise<Response> {
  try {
    const summary = await env.ARTICLES_KV.get('articles-summary');
    if (!summary) {
      throw new Error('No articles summary found in KV');
    }
    return new Response(summary, { headers: { 'content-type': 'application/json;charset=UTF-8' } });
  } catch (error) {
    console.error('Failed to fetch article list:', error);
    return new Response('Failed to fetch article list', { status: 500 });
  }
}

async function fetchArticleBySlug(slug: string, env: Env): Promise<Response> {
  try {
    const article = await env.ARTICLES_KV.get(`article-${slug}`);
    if (!article) {
      return new Response('Article not found', { status: 404 });
    }
    return new Response(article, { headers: { 'content-type': 'application/json;charset=UTF-8' } });
  } catch (error) {
    console.error(`Failed to fetch article by slug (${slug}):`, error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function storeArticleListSummary(articles: Article[], env: Env): Promise<void> {
  try {
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
  } catch (error) {
    console.error('Failed to store article list summary:', error);
    throw error;
  }
}
