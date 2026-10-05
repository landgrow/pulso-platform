import type { MetadataRoute } from "next";

/** Plataforma privada de clientes: pede aos buscadores que não indexem nada. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
