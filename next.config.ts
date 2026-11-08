import type { NextConfig } from "next";

// Reduce serverless bundle size for Vercel deploy (type assertion for Next.js 15 compat)
const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@supabase/**",
      "node_modules/aws-sdk/**",
      "node_modules/@aws-sdk/**",
    ],
  },
  async redirects() {
    return [
      {
        source: "/soccer",
        destination: "/sports/soccer",
        permanent: false,
      },
      {
        source: "/tennis",
        destination: "/sports/tennis",
        permanent: false,
      },
      {
        source: "/admin",
        destination: "/admin/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
