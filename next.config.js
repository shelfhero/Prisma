const { withSentryConfig } = require('@sentry/nextjs')

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization for mobile
  images: {
    domains: [
      'localhost',
      'eisfwocfkejsxipmbyzp.supabase.co'
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Simple webpack override - just disable caching and workers
  webpack: (config, { dev, isServer }) => {
    // Disable webpack cache completely
    config.cache = false;

    // Force single-threaded mode
    config.parallelism = 1;

    // Remove worker-related plugins
    config.plugins = config.plugins.filter(plugin => {
      const name = plugin.constructor.name;
      return !name.includes('Worker') && !name.includes('Thread');
    });

    // Optimize chunk splitting for better caching and smaller initial bundle
    if (!isServer && !dev) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Separate vendor chunks
          default: false,
          vendors: false,
          // Framework chunk (react, react-dom)
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Supabase libraries
          supabase: {
            name: 'supabase',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
            priority: 30,
            enforce: true,
          },
          // UI libraries (radix-ui, lucide-react)
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|sonner)[\\/]/,
            priority: 25,
            enforce: true,
          },
          // Common vendor libraries
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
            priority: 20,
          },
        },
        maxInitialRequests: 25,
        minSize: 20000,
      };
    }

    // Disable worker fallbacks
    config.resolve = config.resolve || {};
    config.resolve.fallback = config.resolve.fallback || {};
    config.resolve.fallback.worker_threads = false;
    config.resolve.fallback.child_process = false;
    config.resolve.fallback.os = false;
    config.resolve.fallback.fs = false;
    config.resolve.fallback.net = false;
    config.resolve.fallback.tls = false;

    return config;
  },

  // Enable React concurrent features for better performance
  reactStrictMode: true,

  // Keep heavy server packages out of client bundle (Next.js 15+)
  serverExternalPackages: [
    '@google-cloud/vision',
    'openai',
    'sharp',
  ],

  experimental: {
    // Optimize package imports for smaller bundle
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-select',
      '@radix-ui/react-label',
      '@radix-ui/react-switch',
      '@radix-ui/react-separator',
      '@radix-ui/react-collapsible',
      '@supabase/supabase-js',
      '@supabase/auth-helpers-nextjs',
      '@supabase/ssr',
      'sonner',
    ],
  },

  // Tree-shake lucide-react icons and other heavy imports
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      skipDefaultConversion: true,
    },
  },

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    // Enable React compiler optimizations
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Performance optimizations
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Compression
  compress: true,

  // Disable powered by header
  poweredByHeader: false,

  // Production source maps (disabled for smaller bundle, but enable for Sentry)
  productionBrowserSourceMaps: true
}

// Sentry configuration
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry webpack plugin
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in production
  silent: true,

  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses all logs
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,
}

// Apply bundle analyzer first, then Sentry
module.exports = withSentryConfig(
  withBundleAnalyzer(nextConfig),
  sentryWebpackPluginOptions
)