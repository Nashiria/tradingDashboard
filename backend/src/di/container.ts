export type DependencyToken<T> = symbol & { readonly __type?: T };

type DependencyFactory<T> = (container: DependencyContainer) => T;

export class DependencyContainer {
  private readonly factories = new Map<symbol, DependencyFactory<unknown>>();
  private readonly singletons = new Map<symbol, unknown>();

  public registerSingleton<T>(
    token: DependencyToken<T>,
    factory: DependencyFactory<T>,
  ): this {
    this.factories.set(token, factory as DependencyFactory<unknown>);
    return this;
  }

  public registerInstance<T>(token: DependencyToken<T>, instance: T): this {
    this.singletons.set(token, instance);
    return this;
  }

  public resolve<T>(token: DependencyToken<T>): T {
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    const factory = this.factories.get(token);

    if (!factory) {
      throw new Error(
        `No dependency registered for token: ${String(token.description ?? token.toString())}`,
      );
    }

    const instance = factory(this) as T;
    this.singletons.set(token, instance);

    return instance;
  }
}
