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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Updates the KV store with articles fetched from the API server.
 * @param env - The environment object containing bindings and configurations.
 * @returns Response indicating the result of the update operation.
 */
async function updateKVStore(env: Env): Promise<Response> {
  try {
    const articles = await fetchArticlesFromAPI(env);
    await storeArticlesInKV(articles, env);
    await storeArticleListSummary(articles, env);
    return new Response('KV Store Updated', { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error updating KV Store:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(`Error updating KV Store: ${errorMessage}`, { status: 500, headers: corsHeaders });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

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

    return new Response('Invalid endpoint', { status: 404, headers: corsHeaders });
  }
};

/**
 * Handles CORS preflight requests.
 * @returns Response with CORS headers.
 */
function handleOptions(): Response {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Fetches articles from the API server.
 * @param env - The environment object containing bindings and configurations.
 * @returns Array of articles fetched from the API server.
 */
async function fetchArticlesFromAPI(env: Env): Promise<Article[]> {
  const response = await fetch(`${env.API_SERVER_BASE_URL}/api/articles`);
  if (!response.ok) {
    throw new Error(`API responded with status ${response.status}`);
  }
  const data = await response.json() as ApiResponse;
  return data.articles;
}

/**
 * Stores articles in the KV store.
 * @param articles - Array of articles to be stored.
 * @param env - The environment object containing bindings and configurations.
 */
async function storeArticlesInKV(articles: Article[], env: Env): Promise<void> {
  const promises = articles.map(article =>
    env.ARTICLES_KV.put(`article-${article.slug}`, JSON.stringify(article))
  );
  await Promise.all(promises);
}

/**
 * Fetches the list of articles from the KV store.
 * @param env - The environment object containing bindings and configurations.
 * @returns Response with the list of articles.
 */
async function fetchArticleList(env: Env): Promise<Response> {
  try {
    const summary = await env.ARTICLES_KV.get('articles-summary');
    if (!summary) {
      throw new Error('No articles summary found in KV');
    }
    return new Response(summary, { headers: { 'content-type': 'application/json;charset=UTF-8', ...corsHeaders } });
  } catch (error) {
    console.error('Failed to fetch article list:', error);
    return new Response('Failed to fetch article list', { status: 500, headers: corsHeaders });
  }
}

/**
 * Fetches a single article by its slug from the KV store.
 * @param slug - The slug of the article to fetch.
 * @param env - The environment object containing bindings and configurations.
 * @returns Response with the article data.
 */
async function fetchArticleBySlug(slug: string, env: Env): Promise<Response> {
  try {
    const article = await env.ARTICLES_KV.get(`article-${slug}`);
    if (!article) {
      return new Response('Article not found', { status: 404, headers: corsHeaders });
    }
    return new Response(article, { headers: { 'content-type': 'application/json;charset=UTF-8', ...corsHeaders } });
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
  }
}

/**
 * Stores the summary of articles in the KV store.
 * @param articles - Array of articles to summarize and store.
 * @param env - The environment object containing bindings and configurations.
 */
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
