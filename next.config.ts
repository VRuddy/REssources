import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  output: 'export',
  trailingSlash: true,
  /* config options here */
};

export default nextConfig;
