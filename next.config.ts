import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained build (server.js plus only the packages it needs) for copying to another machine.
  output: "standalone",
  // Image optimisation is unused; this keeps the platform-specific sharp binary out of the bundle.
  images: { unoptimized: true },
  serverExternalPackages: ["axios-ntlm"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
