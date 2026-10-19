/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // pptxgenjs 类型定义不完整（shapes/charts 等），忽略构建类型检查
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'recharts'],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.cache = false;
    }
    // pptxgenjs 使用了 node:fs / node:https 等动态 import，
    // resolve.alias 无法处理 node: scheme，需要用插件拦截
    if (!isServer) {
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:fs$/, require('path').resolve(__dirname, 'src/lib/shims/node-fs.js')),
        new webpack.NormalModuleReplacementPlugin(/^node:https$/, require('path').resolve(__dirname, 'src/lib/shims/node-https.js')),
      );
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
