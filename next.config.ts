import type { NextConfig } from "next";

/*
 * Content-Security-Policy.
 *
 * `script-src` garde `'unsafe-inline'` car Next.js App Router injecte des
 * scripts d'hydratation en ligne sans nonce dans cette configuration ; c'est
 * une limite connue à resserrer plus tard avec un nonce par requête via le
 * middleware. `style-src 'unsafe-inline'` est requis par Tailwind/`styled-jsx`.
 * Le reste est verrouillé : pas d'objets, pas d'iframes tierces, connexions
 * limitées à l'origine et à Supabase.
 */
const supabaseHost = "https://*.supabase.co";
const supabaseSocket = "wss://*.supabase.co";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: " + supabaseHost,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseHost} ${supabaseSocket}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "llawfjczwmhiguwmtqkd.supabase.co",
        pathname: "/storage/v1/object/public/pharmacy-logos/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), geolocation=(self), microphone=(), payment=(), usb=(self), web-share=(self)",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
