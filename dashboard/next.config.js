/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose custom-named Supabase env vars to browser client components.
  // These are read from .env.local at build/dev-server startup time.
  env: {
    SUPA_URL: process.env.SUPA_URL,
    PUBLIC_SUPA_ANON_KEY: process.env.PUBLIC_SUPA_ANON_KEY,
    SUPA_DATA_TABLE_NAME: process.env.SUPA_DATA_TABLE_NAME,
    SUPA_MASTERLIST_TABLE_NAME: process.env.SUPA_MASTERLIST_TABLE_NAME,
  },
};

module.exports = nextConfig;
