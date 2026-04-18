/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'googleusercontent.com' },
    ],
  },
  // Proxy Firebase auth handler to same domain — fixes Safari ITP cookie blocking
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://leyva-3c8aa.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
