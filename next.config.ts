import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql", "web-push"],
  poweredByHeader: false,
};

export default nextConfig;
