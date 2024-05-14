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

interface Env {
  API_SERVER_BASE_URL: string;
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/articles') {
    return fetchArticleList();
  } else if (url.pathname.startsWith('/articles/')) {
    const slug = url.pathname.split('/')[2]; // Assumes URL pattern is /articles/{slug}
    return fetchArticleBySlug(slug);
  } else if (url.pathname.startsWith('/update-kv')) {
    return updateKVStore();
  }
  return new Response('Invalid endpoint', { status: 404 });
}

async function storeArticlesInKV(articles: Article[]): Promise<void> {
  // Store each article by its slug
  const articlePromises = articles.map(article =>
    ARTICLES_KV.put(`article-${article.slug}`, JSON.stringify(article))
  );

  // Prepare a summary list of articles for listing purposes
  const articleSummaries = articles.map(article => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    description: article.description,
    authorFullName: article.authorFullName,
    coverImgSrc: article.coverImgSrc,
    publishedDate: article.publishedDate,
    isActive: article.isActive
  }));

  // Store the summary list under a specific key
  const summaryPromise = ARTICLES_KV.put('articles-summary', JSON.stringify(articleSummaries));

  // Wait for all promises to resolve
  await Promise.all([...articlePromises, summaryPromise]);
}

async function fetchArticleList(): Promise<Response> {
  const summary = await ARTICLES_KV.get('articles-summary');
  return new Response(summary, {
    headers: { 'content-type': 'application/json;charset=UTF-8' }
  });
}

async function fetchArticleBySlug(slug: string): Promise<Response> {
  const article = await ARTICLES_KV.get(`article-${slug}`);
  return article
    ? new Response(article, {
      headers: { 'content-type': 'application/json;charset=UTF-8' }
    })
    : new Response('Article not found', { status: 404 });
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
  const response = await fetch(`${env.API_SERVER_BASE_URL}/api/articles`);
  const data = await response.json() as ApiResponse;
  return data.articles;
}
