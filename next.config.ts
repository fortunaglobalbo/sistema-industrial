import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'sistema-industrial-beta.vercel.app',
        'sistema-industrial-inra1dcy6-fortunaglobalbo-9758s-projects.vercel.app',
        '*.vercel.app',
        'localhost:3000'
      ],
      bodySizeLimit: '10mb'
    },
  },
};

export default nextConfig;
