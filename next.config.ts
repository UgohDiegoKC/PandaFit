import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@libsql/client", "libsql", "web-push"],
  poweredByHeader: false,
};

export default nextConfig;
