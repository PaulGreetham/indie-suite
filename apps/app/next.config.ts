import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content Security Policy for the authenticated app. Shipped as Report-Only first: violations are logged in
// the browser console without blocking, so missing origins (e.g. inside the Firma editor) can be added before
// it is enforced. Next.js needs 'unsafe-inline' for its bootstrap scripts, and 'unsafe-eval' only in dev.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://api.firma.dev https://*.firma.dev https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://*.firma.dev",
  "img-src 'self' data: blob: https://api.mapbox.com https://*.firma.dev",
  "font-src 'self' data: https://*.firma.dev",
  "connect-src 'self' https://*.googleapis.com https://api.mapbox.com https://events.mapbox.com https://*.firma.dev https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-src 'self' https://*.firma.dev https://*.firebaseapp.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Report-Only policies ignore frame-ancestors, so clickjacking is blocked by X-Frame-Options until CSP is enforced
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  // Ensure puppeteer-core and @sparticuz/chromium are treated as external server packages
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],

  // Ensure Chromium binaries are traced into the serverless functions for these routes
  outputFileTracingIncludes: {
    "/api/invoices/[id]/pdf": ["./node_modules/@sparticuz/chromium/**"],
    "/api/invoices/[id]/receipt": ["./node_modules/@sparticuz/chromium/**"],
  },
  transpilePackages: ["@indie-suite/shared", "@indie-suite/ui"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
