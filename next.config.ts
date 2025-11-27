import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Performance optimizations */
  reactStrictMode: true,
  swcMinify: true,
  
  /* Image optimization */
  images: {
    domains: [
      'oaidalleapiprodscus.blob.core.windows.net',
      'fal.media',
      'cdn.openai.com',
      'generativelanguage.googleapis.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  /* Compression */
  compress: true,
  
  /* Experimental features for better performance */
  experimental: {
    optimizePackageImports: ['lucide-react', '@xyflow/react'],
  },
  
  /* Headers for security and performance */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
