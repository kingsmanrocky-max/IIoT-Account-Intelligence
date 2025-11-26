import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for optimized Docker builds
  output: 'standalone',

  // Image optimization configuration for production
  images: {
    remotePatterns: [
      // Add any remote image domains here if needed
      // Example:
      // {
      //   protocol: 'https',
      //   hostname: 'example.com',
      // },
    ],
  },
};

export default nextConfig;
