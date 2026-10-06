import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // Native/Node-only packages that must not be bundled.
  serverExternalPackages: ["@libsql/client", "libsql", "sharp"],
  async headers() {
    return [
      {
        // Everything except the embeddable viewer may only be framed by us.
        source: "/:path((?!embed/).*)",
        headers: [...securityHeaders, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        // The embed route is designed to be iframed on any website.
        source: "/embed/:path*",
        headers: [...securityHeaders, { key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
    ];
  },
  async redirects() {
    return [{ source: "/tour/:slug", destination: "/t/:slug", permanent: true }];
  },
};

export default nextConfig;
