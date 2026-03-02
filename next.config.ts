import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // EC2 self-hosted: menghasilkan .next/standalone yang bisa jalan tanpa node_modules penuh
};

export default nextConfig;
