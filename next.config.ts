import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["mbmnsmzllagmbkvlnfwt.supabase.co"], // your Supabase domain
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: { appDir: true }, // if you are using app directory
  output: "standalone",           // for Netlify
  trailingSlash: true,            // helps with Netlify routing
};

export default nextConfig;
