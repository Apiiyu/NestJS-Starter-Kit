// Test
import {
  clearE2EContainerState,
  getE2EContainerState,
  stopE2EContainers,
} from './e2e-container-state';

export default async function globalTeardown(): Promise<void> {
  const containerState = getE2EContainerState();

  if (!containerState) {
    return;
  }

  const cleanupErrors = await stopE2EContainers(containerState);
  clearE2EContainerState();

  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      `E2E global teardown failed to stop ${cleanupErrors.length} container(s).`,
    );
  }
}
