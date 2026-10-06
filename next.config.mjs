/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/hello-spec-kit",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
