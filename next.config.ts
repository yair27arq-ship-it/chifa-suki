import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Tree-shaking agresivo para lucide-react: reduce el JS que llega al cliente
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
