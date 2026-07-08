import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
