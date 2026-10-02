import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseUrl.replace(/^http/, "ws");

// 'unsafe-inline' em script/style: o App Router injeta scripts inline de
// hidratação; trocar por nonce exige renderização dinâmica em tudo. A CSP
// ainda bloqueia scripts de terceiros, framing e conexões fora do Supabase.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}${isDev ? " ws://localhost:*" : ""}`.trim(),
  "frame-src 'self' https://drive.google.com https://docs.google.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Anexo de card aceita até 4 MB (drive.ts) + overhead do multipart; o
      // padrão é 1 MB e o teto do corpo de função na Vercel é 4,5 MB.
      bodySizeLimit: "4.5mb",
    },
  },
  async headers() {
    return [
      {
        // O protótipo estático em /preview carrega libs de CDN — fica fora da CSP.
        source: "/((?!preview/).*)",
        headers: securityHeaders,
      },
      {
        source: "/preview/kanban.html",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
