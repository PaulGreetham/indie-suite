import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure puppeteer-core and @sparticuz/chromium are treated as external server packages
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],

  // Ensure Chromium binaries are traced into the serverless functions for these routes
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium/**"],
    "/api/invoices/[id]/pdf": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
