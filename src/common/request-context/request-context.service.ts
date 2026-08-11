// Interfaces
import type { IRequestContextStore } from './request-context.interface';

// NestJS Libraries
import { Injectable } from '@nestjs/common';

// Third Party Libraries
import { AsyncLocalStorage } from 'async_hooks';

/**
 * @description Carries per-request data — request ID, correlation ID, authenticated user —
 * without threading it through every function signature.
 *
 * Backed by `AsyncLocalStorage`, so the store follows the asynchronous call chain of one
 * request and cannot leak into a concurrent one. That is what lets a logger deep in a service
 * stamp the right request ID without the service knowing anything about HTTP.
 */
@Injectable()
export class RequestContextService {
  private readonly _asyncLocalStorage = new AsyncLocalStorage<IRequestContextStore>();

  /**
   * @description Returns the current request's store, or undefined outside a request.
   *
   * Undefined is a normal answer, not an error: startup code, queue workers, and scheduled
   * jobs all run with no request around them.
   */
  public getStore(): IRequestContextStore | undefined {
    return this._asyncLocalStorage.getStore();
  }

  /**
   * @description Returns the authenticated user for the current request, if there is one.
   *
   * Undefined covers both "no request" and "request is unauthenticated", so a caller must
   * never treat a value here as proof of authorization — that is the guards' job.
   */
  public getUser(): IRequestUser | undefined {
    return this.getStore()?.user;
  }

  public get requestId(): string | undefined {
    return this.getStore()?.requestId;
  }

  public get correlationId(): string | undefined {
    return this.getStore()?.correlationId;
  }

  /**
   * @description Runs a callback with the given store bound to it and everything it awaits.
   *
   * Called once per request by the middleware. Everything downstream — including code that
   * runs after an `await` — sees this store and no other.
   *
   * @param store The context to bind for the duration of the callback.
   * @param callback The work to run inside that context.
   */
  public run<T>(store: IRequestContextStore, callback: () => T): T {
    return this._asyncLocalStorage.run(store, callback);
  }

  /**
   * @description Attaches the authenticated user to the current store.
   *
   * Called after authentication, because the middleware creates the store before any guard has
   * run and therefore before the user is known. A no-op outside a request rather than a throw
   * — a caller should not have to know whether it is on a request path.
   *
   * @param user The authenticated user, or undefined to clear it.
   */
  public setUser(user?: IRequestUser): void {
    const store = this.getStore();

    if (!store) {
      return;
    }

    store.user = user;
  }
}
