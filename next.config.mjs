/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // The app ships without an ESLint config so `npm run build` works out of the box.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
