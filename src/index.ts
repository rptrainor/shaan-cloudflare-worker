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
  id: number; // assuming id is always present and automatically populated
  createdAt: string; // typically in ISO format, corresponding to `created_at` in Laravel
  updatedAt: string; // corresponding to `updated_at` in Laravel
  slug: string; // unique identifier for each article
  title: string;
  description: string | null; // nullable
  body: string;
  authorFullName: string | null; // nullable, corresponds to `author_full_name`
  coverImgSrc: string | null; // nullable, corresponds to `cover_img_src`
  coverImgAlt: string | null; // nullable, corresponds to `cover_img_alt`
  isActive: boolean; // corresponds to `is_active`
  publishedDate: string; // assuming date format, corresponds to `published_date`
}

interface ApiResponse {
  articles: Article[];
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/update-kv')) {
    return updateKVStore();
  }
  return new Response('Invalid endpoint', { status: 404 });
}

async function updateKVStore(): Promise<Response> {
  try {
    const articles = await fetchArticlesFromAPI();
    await storeArticlesInKV(articles);
    return new Response('KV Store Updated', { status: 200 });
  } catch (error) {
    // Type guard
    if (error instanceof Error) {
      return new Response('Error updating KV Store: ' + error.message, { status: 500 });
    } else {
      return new Response('An unknown error occurred', { status: 500 });
    }
  }
}

async function fetchArticlesFromAPI(): Promise<Article[]> {
  const response = await fetch('https://xsbmud3qw6ewsl266xeb7dwwtu0vvzam.lambda-url.us-east-2.on.aws/api/articles');
  const data = await response.json() as ApiResponse;
  return data.articles;
}

async function storeArticlesInKV(articles: Article[]): Promise<void> {
  const promises = articles.map(article => {
    return ARTICLES_KV.put(article.slug, JSON.stringify(article));
  });
  await Promise.all(promises);
}