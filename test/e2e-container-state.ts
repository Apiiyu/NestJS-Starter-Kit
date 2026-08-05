// Testcontainers
import type { StartedTestContainer } from 'testcontainers';

export interface IE2EContainerState {
  postgresContainer?: StartedTestContainer;
  redisContainer?: StartedTestContainer;
}

/**
 * Jest hands nothing from `globalSetup` to `globalTeardown` except `globalThis`, so the
 * started containers have to live there for teardown to be able to stop them.
 *
 * The property is named and accessed statically rather than through a `KEY` constant and
 * a computed lookup: computed access on `globalThis` trips the object-injection rule, and
 * the naming-convention rule rejects the `__WRAPPED__` spelling the convention would
 * otherwise suggest. The repo-qualified name is collision-proof on its own.
 */
declare global {
  var nestjsStarterKitE2EContainers: IE2EContainerState | undefined;
}

export const clearE2EContainerState = (): void => {
  globalThis.nestjsStarterKitE2EContainers = undefined;
};

export const getE2EContainerState = (): IE2EContainerState | undefined =>
  globalThis.nestjsStarterKitE2EContainers;

export const setE2EContainerState = (state: IE2EContainerState): void => {
  globalThis.nestjsStarterKitE2EContainers = state;
};

const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
  description: string,
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${description} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const stopContainer = async (
  container: StartedTestContainer | undefined,
  name: string,
): Promise<Error | null> => {
  if (!container) {
    return null;
  }

  try {
    await withTimeout(container.stop({ timeout: 10_000 }), 15_000, `Stopping ${name} container`);

    return null;
  } catch (error: unknown) {
    return new Error(`Failed to stop ${name} container: ${(error as Error).message}`, {
      cause: error,
    });
  }
};

export const stopE2EContainers = async (state: IE2EContainerState): Promise<Error[]> => {
  const stopResults = await Promise.all([
    stopContainer(state.postgresContainer, 'Postgres'),
    stopContainer(state.redisContainer, 'Redis'),
  ]);

  return stopResults.filter((error): error is Error => error !== null);
};
