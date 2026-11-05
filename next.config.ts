import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Test-hook flag (001 ui-shell.md §7.2; owner decision 2026-11-06). Next inlines a
    // NEXT_PUBLIC_* variable only when it is defined at build time, so it is always
    // defined here: '1' only when the build environment sets exactly '1' (the E2E
    // build), otherwise ''. This can never turn the hooks on by itself; it lets the
    // minifier remove the hook code from every normal build.
    NEXT_PUBLIC_TEST_HOOKS: process.env.NEXT_PUBLIC_TEST_HOOKS === "1" ? "1" : "",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
