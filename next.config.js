/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal safe configuration
  images: {
    domains: [
      'localhost',
      'eisfwocfkejsxipmbyzp.supabase.co'
    ]
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

    // Handle Google Cloud Vision specifically
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@google-cloud/vision': 'commonjs @google-cloud/vision'
      });
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

  // Disable all features that might cause worker issues
  swcMinify: false,
  experimental: {
    workerThreads: false,
    esmExternals: false
  }
}

module.exports = nextConfig