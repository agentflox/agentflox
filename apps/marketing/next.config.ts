import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    distDir: ".next-marketing",
    outputFileTracing: false,
    transpilePackages: ["@agentflox/types"],
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
};

export default nextConfig;
