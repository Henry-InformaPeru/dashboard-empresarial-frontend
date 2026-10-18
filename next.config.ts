import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servidor mínimo para el contenedor (ver Dockerfile)
  output: "standalone",
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
