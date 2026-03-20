import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone' removed — server runs with `next start` via PM2
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'radix-ui',
      'recharts',
      'date-fns',
    ],
  },
};

export default nextConfig;
