"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nextConfig = {
    // Ensure puppeteer-core and @sparticuz/chromium are treated as external server packages
    serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
    // Ensure Chromium binaries are traced into the serverless functions for these routes
    outputFileTracingIncludes: {
        "/api/pdf": ["./node_modules/@sparticuz/chromium/**"],
        "/api/invoices/[id]/pdf": ["./node_modules/@sparticuz/chromium/**"],
    },
    transpilePackages: ["@indie-suite/shared", "@indie-suite/ui"],
};
exports.default = nextConfig;
