import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  eslint: {
    // Lint rules should run during builds — re-enabled to fix remaining issues.
  },
};

export default nextConfig;
