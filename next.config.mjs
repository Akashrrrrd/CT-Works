/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    turbo: {
      resolveAlias: {
        // Redirect fflate's Node.js CJS entry to the browser ESM build
        // so Turbopack doesn't try to resolve the dynamic Worker import
        'fflate/lib/node.cjs': 'fflate/esm/browser.js',
      },
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent jspdf and its Node.js worker deps from being bundled server-side
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'jspdf',
        'jspdf-autotable',
        'fflate',
      ];
    }
    return config;
  },
}

export default nextConfig
