import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker multi-stage build — outputs a self-contained
  // server bundle in .next/standalone instead of requiring node_modules at runtime.
  output: "standalone",
};

export default nextConfig;
