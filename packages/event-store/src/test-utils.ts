/**
 * Test utilities for event-store package
 *
 * This file exports test-only dependencies that should not be included
 * in production bundles (e.g., testcontainers).
 */

// Re-export testcontainers for testing
export {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
