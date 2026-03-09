import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracing: false,
  transpilePackages: ["@agentflox/types"],
};

export default nextConfig;

