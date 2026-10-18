/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone build — smallest possible deployment bundle
  output: "standalone",

  // Compress responses with gzip
  compress: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
    // Serve modern formats (avif → webp → jpg fallback)
    formats: ["image/avif", "image/webp"],
    // Aggressive browser caching for profile images
    minimumCacheTTL: 3600,
  },

  // Strict mode catches subtle bugs earlier, zero perf cost in prod
  reactStrictMode: true,

  // Expose the API URL to client and server components
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  },
};

module.exports = nextConfig;
