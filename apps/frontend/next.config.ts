import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
//@ts-ignore
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

const nextConfig: NextConfig = {
  async rewrites() {
    const explicitBackendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.SERVER_URL;

    const backendUrl =
      explicitBackendUrl || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3002' : undefined);

    if (!backendUrl) return [];

    return [
      { source: '/api/inngest', destination: `${backendUrl}/api/inngest` },
      { source: '/api/inngest/:path*', destination: `${backendUrl}/api/inngest/:path*` },

      // Inngest CLI probes common handler locations; route them all to the backend handler.
      { source: '/x/inngest', destination: `${backendUrl}/api/inngest` },
      { source: '/x/inngest/:path*', destination: `${backendUrl}/api/inngest/:path*` },
      { source: '/.netlify/functions/inngest', destination: `${backendUrl}/api/inngest` },
      { source: '/.netlify/functions/inngest/:path*', destination: `${backendUrl}/api/inngest/:path*` },
      { source: '/.redwood/functions/inngest', destination: `${backendUrl}/api/inngest` },
      { source: '/.redwood/functions/inngest/:path*', destination: `${backendUrl}/api/inngest/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ijgsjckixpijaelkspjf.supabase.co',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  transpilePackages: ["@agentflox/types"],
  outputFileTracingIncludes: {
    '/api/**': [
      '../../packages/database/src/generated/prisma/schema.prisma',
      '../../packages/database/src/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node',
      '../../packages/database/node_modules/.prisma/client/**/*'
    ],
    '/*': [
      '../../packages/database/src/generated/prisma/schema.prisma',
      '../../packages/database/src/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node',
      '../../packages/database/node_modules/.prisma/client/**/*'
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'date-fns'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "agentflox",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Disabled — widenClientFileUpload causes OOM on Vercel build containers (exit 137)
  widenClientFileUpload: false,

  // NOTE: tunnelRoute removed — Cloudflare was rate-limiting (429) the /monitoring endpoint.

  // Disable telemetry network requests which can hang the build without an auth token
  telemetry: false,

  // Do not try to upload source maps if no token is present, preventing deadlocks
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
});
