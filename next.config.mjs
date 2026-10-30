/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SITE_NAME:
      process.env.NEXT_PUBLIC_SITE_NAME ?? "Signal & Story",
  },
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
