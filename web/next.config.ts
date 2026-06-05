import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
