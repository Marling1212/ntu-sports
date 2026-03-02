import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Slightly reduce deploy size to avoid "Deploying outputs" internal errors on Vercel
  outputFileTracingExcludes: {
    "*": ["node_modules/webpack/**", "node_modules/aws-sdk/**"],
  },
};

export default nextConfig;

