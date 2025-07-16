import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      // Redirect crewflow.dev to crewflow.ai
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'crewflow.dev',
          },
        ],
        destination: 'https://crewflow.ai/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.crewflow.dev',
          },
        ],
        destination: 'https://crewflow.ai/:path*',
        permanent: true,
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'crewflow.ai',
        'www.crewflow.ai'
      ]
    }
  },
  images: {
    domains: [
      'localhost',
      'crewflow.ai'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
