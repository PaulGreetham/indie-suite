import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Report-Only first so violations can be checked in the browser console before the policy is enforced
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://rsms.me",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://rsms.me",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "localhost" }, { hostname: "randomuser.me" }],
  },
  transpilePackages: ["@indie-suite/shared", "@indie-suite/ui"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
