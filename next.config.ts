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
};


module.exports = nextConfig;


export default nextConfig;
