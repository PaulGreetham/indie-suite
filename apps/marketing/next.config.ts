import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "localhost" }, { hostname: "randomuser.me" }],
  },
  transpilePackages: ["@indie-suite/shared", "@indie-suite/ui"],
  async redirects() {
    const base = process.env.NEXT_PUBLIC_MAIN_APP_URL;
    if (!base) return [];

    return [
      {
        source: "/signup",
        destination: `${base}/signup`,
        permanent: false,
      },
      {
        source: "/login",
        destination: `${base}/login`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
