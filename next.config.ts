import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,

  // Keep Baileys and its native/Node-only dependencies out of the webpack bundle.
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "@hapi/boom",
    "noise-handshake",
    "curve25519-js",
    "detect-libc",
    "noise-curve-ed25519",
    "libsignal",
    "sharp",
  ],

  webpack(config, { webpack: wp, isServer }) {
    // Strip `node:` URI prefix (e.g. `node:child_process` → `child_process`)
    // BEFORE webpack tries to handle the scheme, which it cannot do by default.
    config.plugins.push(
      new wp.NormalModuleReplacementPlugin(
        /^node:/,
        (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        },
      ),
    );

    // Silently ignore optional Baileys peer deps that are loaded with
    // import('jimp').catch(() => {}) — they aren't installed and that's fine.
    config.plugins.push(
      new wp.IgnorePlugin({
        resourceRegExp:
          /^(jimp|link-preview-js|got|@jimp\/custom|audio-decode)$/,
      }),
    );

    // `serverExternalPackages` only applies to Server Components / Route Handlers.
    // The instrumentation.ts file uses a separate webpack pass that bypasses it.
    // We add an externals function so Baileys and its native deps are NEVER
    // bundled in any server-side compilation, including instrumentation.
    if (isServer) {
      const nativePkgs = [
        "@whiskeysockets/baileys",
        "@hapi/boom",
        "noise-handshake",
        "curve25519-js",
        "detect-libc",
        "noise-curve-ed25519",
        "libsignal",
        "sharp",
        "@img",
      ];

      type ExternalsCb = (err?: Error | null, result?: string) => void;
      type ExternalsCtx = { request?: string };

      const existingExternals = Array.isArray(config.externals)
        ? [...(config.externals as unknown[])]
        : config.externals != null
          ? [config.externals]
          : [];

      config.externals = [
        ...existingExternals,
        (ctx: ExternalsCtx, cb: ExternalsCb) => {
          const req = ctx.request ?? "";
          if (
            nativePkgs.some((pkg) => req === pkg || req.startsWith(pkg + "/"))
          ) {
            return cb(null, "commonjs " + req);
          }
          cb();
        },
      ];
    }

    // Map native Node.js built-ins to empty stubs so webpack doesn't fail when
    // following the import tree of server-only packages.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      child_process: false,
      crypto: false,
      fs: false,
      net: false,
      tls: false,
      os: false,
      path: false,
      stream: false,
      buffer: false,
      zlib: false,
      http: false,
      https: false,
      url: false,
      events: false,
      assert: false,
      util: false,
      querystring: false,
      dns: false,
      dgram: false,
      readline: false,
      worker_threads: false,
      perf_hooks: false,
      vm: false,
      v8: false,
    };

    return config;
  },
};

export default nextConfig;
