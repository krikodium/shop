import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El servidor de verificación escribe sus artefactos fuera del dev server habitual.
  distDir: process.env.SHOP_VERIFICACION === "1" ? "output/verification-next" : ".next",
};

export default nextConfig;
