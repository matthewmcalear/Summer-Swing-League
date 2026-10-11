/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Partial Prerendering: pages are served from a cache that's refreshed whenever
  // league data changes (see lib/cache.ts) instead of querying Postgres per request.
  cacheComponents: true,
  cacheLife: {
    // League data: expired on every write via the 'league' tag. The 5-minute background
    // refresh is a safety net — any missed invalidation heals within minutes — and keeps
    // time-based bits (days left, week-over-week movement) current. 30s is the shortest
    // client staleness Next allows for prerendered content.
    league: { stale: 30, revalidate: 300, expire: 3600 },
  },
}

export default nextConfig
