import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

const nextConfig: NextConfig = {
  agentRules: false,
  // Dockerfile copies .next/standalone into the runtime image — that folder only exists when
  // this is set (docs/build/PERFORMANCE_PLAN.md §5.3).
  output: 'standalone',
  // Automatic memoization — eslint-config-next already pulls in eslint-plugin-react-hooks@7,
  // whose recommended rules include the compiler-aware checks (docs/build/PERFORMANCE_PLAN.md
  // §3 "React Compiler · cacheComponents flag · F8").
  reactCompiler: true,
  // Enables Partial Prerendering: every route now gets a prerendered shell with dynamic content
  // streamed in through the Suspense boundary each route's loading.tsx provides (F7). No `'use
  // cache'` exists in the codebase yet, so nothing is actually cached by this alone — it only
  // changes rendering/streaming, not data freshness. Establishing `'use cache'` + `cacheTag` on
  // the curriculum layer is separate, future work that requires the Redis cache handler and the
  // WIOA-consumer audit described in docs/build/PERFORMANCE_PLAN.md §5.1 first.
  cacheComponents: true,
  experimental: {
    // WIOA document uploads (src/lib/actions/wioa.ts) go through a Server Action; the framework
    // default of 1MB is smaller than a typical scanned document or phone photo.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

// Self-hosted (VPS + Docker, not Vercel) has no automatic source-map upload at build time — this
// wrapper is that missing hook. It only uploads when SENTRY_AUTH_TOKEN is present (CI/deploy);
// without it, this no-ops and the build is unaffected (docs/build/PERFORMANCE_PLAN.md §5.3).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  // Removes the wrapping's bundled copy of source maps from the client-facing output after
  // upload, so minified-but-mapped files aren't themselves served publicly.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
