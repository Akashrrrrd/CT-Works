/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
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
