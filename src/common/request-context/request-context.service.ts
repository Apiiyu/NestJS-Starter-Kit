import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';
import type { IRequestContextStore } from './request-context.interface';

@Injectable()
export class RequestContextService {
  private readonly _asyncLocalStorage = new AsyncLocalStorage<IRequestContextStore>();

  public run<T>(store: IRequestContextStore, callback: () => T): T {
    return this._asyncLocalStorage.run(store, callback);
  }

  public getStore(): IRequestContextStore | undefined {
    return this._asyncLocalStorage.getStore();
  }

  public get requestId(): string | undefined {
    return this.getStore()?.requestId;
  }

  public get correlationId(): string | undefined {
    return this.getStore()?.correlationId;
  }

  public setUser(user?: IRequestUser): void {
    const store = this.getStore();

    if (!store) {
      return;
    }

    store.user = user;
  }

  public getUser(): IRequestUser | undefined {
    return this.getStore()?.user;
  }
}
