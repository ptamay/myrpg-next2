import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack(config) {
    config.cache = {
      ...config.cache,
      maxMemoryGenerations: 1,
    };
    
    // Suppress PackFileCacheStrategy warnings
    config.infrastructureLogging = {
      level: 'error',
    };
    
    return config;
  },
};

export default nextConfig;
