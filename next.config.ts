import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    // WIOA document uploads (src/lib/actions/wioa.ts) go through a Server Action; the framework
    // default of 1MB is smaller than a typical scanned document or phone photo.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
