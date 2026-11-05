import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Explicitly include the inline email asset in Vercel's serverless bundles.
  outputFileTracingIncludes: {
    "/api/**/*": ["./public/brand/nasouj-wave.png"],
  },
};

export default nextConfig;
