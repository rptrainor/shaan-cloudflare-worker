# Cloudflare Workers for Blog Web App

This repository is part of a larger project that demonstrates a blog web application using Laravel, Cloudflare Workers, Nuxt, Vue, and TailwindCSS. This specific repository contains the Cloudflare Workers that handle serverless functions for the blog.

## Role in the Larger Project

The Cloudflare Workers serve as edge functions that handle specific tasks such as caching, KV store management, and routing. They enhance the performance and scalability of the application by offloading certain operations to the edge, ensuring faster response times for global users.

## Why Build This Part?

The majority of visitors to this blog web app will land on the client, which is the Nuxt/Vue app. The client will then call this Cloudflare Worker to fetch the latest list of articles. When new articles are created, updated, or deleted from the blog, the `/update-kv` endpoint is called on this Cloudflare Worker, and the latest changes are fetched from the Laravel web server and D1 SQLite database. This design gives us the best of both worlds with the high performance of the Cloudflare Global Network alongside the well-designed systems of a Laravel web server.

Cloudflare Workers provide a powerful platform for running JavaScript functions at the edge of the Cloudflare network. We use them in this project for three main reasons:

1. **Performance**: By caching content and handling requests at the edge, we significantly reduce latency and improve load times for users worldwide.

2. **Scalability**: Offloading tasks like KV store management to Cloudflare Workers allows our application to scale effortlessly, handling more traffic without adding complexity to our core backend infrastructure.

3. **Flexibility**: Cloudflare Workers offer a flexible and cost-effective way to implement custom logic and routing, enhancing our ability to deliver a responsive and efficient web application.

## Technologies Used

- Cloudflare Workers
- TypeScript
- Cloudflare KV Storage

## Setup Instructions

1. **Clone the repository:**

    ```bash
    git clone https://github.com/rptrainor/shaan-cloudflare-worker.git
    cd shaan-cloudflare-worker
    ```

2. **Install dependencies:**

    ```bash
    pnpm install
    ```

3. **Configure the `wrangler.toml` file with your Cloudflare account details:**

    ```toml
    name = "your-worker-name"
    main = "src/index.ts"
    compatibility_date = "2024-05-12"
    compatibility_flags = ["nodejs_compat"]

    kv_namespaces = [ { binding = "ARTICLES_KV", id = "your-worker-id" } ]

    [vars]
      API_SERVER_BASE_URL = "https://url-to-your-server.us-east-2.on.aws"
    ```

4. **Deploy the worker:**

    ```bash
    pnpm run deploy
    ```

## Functions

- `GET /articles` - Fetches article summaries from the KV store.
- `GET /articles/{slug}` - Fetches a single article by slug from the KV store.
- `POST /update-kv` - Updates the KV store with data from the Laravel API.

Ensure you have the necessary environment variables set for your Cloudflare account and KV store.

## Contributing

If you would like to contribute to this project, please fork the repository and use a feature branch. Pull requests are warmly welcome.

## License

This project is licensed under the MIT License.
