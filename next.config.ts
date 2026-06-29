import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "llawfjczwmhiguwmtqkd.supabase.co",
        pathname: "/storage/v1/object/public/pharmacy-logos/**",
      },
    ],
  },
};

export default nextConfig;