/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'your-project.supabase.co'
    ]
  },
  env: {
    CUSTOM_KEY: 'prizma-app'
  }
}

module.exports = nextConfig