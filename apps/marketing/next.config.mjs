/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "localhost" }, { hostname: "randomuser.me" }],
  },
  transpilePackages: ["@indie-suite/shared"],
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
