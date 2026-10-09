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
    // League data: expired on every write via the 'league' tag, refreshed hourly for
    // time-based bits (days left, week-over-week movement). 30s is the shortest
    // client staleness Next allows for prerendered content.
    league: { stale: 30, revalidate: 3600, expire: 86400 },
  },
}

export default nextConfig
