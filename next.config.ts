import type { NextConfig } from "next";

// Reduce serverless bundle size for Vercel deploy (type assertion for Next.js 15 compat)
const nextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@supabase/**",
      "node_modules/aws-sdk/**",
      "node_modules/@aws-sdk/**",
    ],
  },
} as NextConfig;

export default nextConfig;

