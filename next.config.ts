import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "exceljs", "isomorphic-dompurify", "jsdom"],
};

export default nextConfig;
