import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — generates plain HTML/CSS/JS into `out/`, which is what
  // GitHub Pages serves. (Pages can't run a Node server.)
  output: "export",
  // next/image's optimizer needs a server, so it's disabled for static export.
  images: { unoptimized: true },
};

export default nextConfig;
