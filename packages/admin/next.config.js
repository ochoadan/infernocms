/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow API calls to the core server
  async rewrites() {
    const apiUrl = process.env.INFERNOCMS_API_URL ?? 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
