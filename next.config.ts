import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The v0.9 package's PixelIcon registry imports the frozen PixelForge
  // marks as React components (`import IconApi from '.../api-32.svg'`).
  // Next has no built-in loader for that, so those imports resolve to a
  // URL string and rendering one via createElement throws. SVGR is the
  // standard fix and keeps the package file unedited — the alternative
  // was rewriting a locked component to use <img>, which would have lost
  // the currentColor/size props the registry relies on.
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

export default nextConfig;
