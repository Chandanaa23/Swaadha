import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["mbmnsmzllagmbkvlnfwt.supabase.co"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  output: "standalone", // required for Netlify
  trailingSlash: true,  // helps Netlify routing
  // experimental.appDir removed
};

export default nextConfig;
