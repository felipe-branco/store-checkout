/**
 * Use for integration tests that require Docker (testcontainers).
 * These tests run only on CI; locally the block is not registered at all,
 * so beforeAll/setupTestDatabase never runs and no containers are started.
 *
 * Note: describe.skip would still run beforeAll hooks, so we use a conditional
 * to avoid registering the suite when not in CI.
 *
 * We require CI === "true" (GitHub Actions sets this). Some environments
 * may set CI to other values; we only run when explicitly in CI.
 */
export const runIntegrationTests = process.env.CI === "true";
