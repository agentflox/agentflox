import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
//@ts-ignore
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

const nextConfig: NextConfig = {
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY
  },
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

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true
});
