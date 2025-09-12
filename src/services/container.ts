/**
 * Generic Dependency Injection Container
 * Supports both singleton and factory patterns
 */
export class DIContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();
  private singletons = new Map<string, any>();

  /**
   * Register a service instance
   */
  register<T>(key: string, service: T): this {
    this.services.set(key, service);
    return this;
  }

  /**
   * Register a factory function for lazy instantiation
   */
  registerFactory<T>(key: string, factory: () => T): this {
    this.factories.set(key, factory);
    return this;
  }

  /**
   * Register a singleton factory
   */
  registerSingleton<T>(key: string, factory: () => T): this {
    this.factories.set(key, factory);
    this.singletons.set(key, undefined); // Mark as singleton
    return this;
  }

  /**
   * Resolve a service by key
   */
  resolve<T>(key: string): T {
    // Check if it's a direct service registration
    if (this.services.has(key)) {
      return this.services.get(key);
    }

    // Check if it's a factory
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      
      // If it's marked as singleton, create once and cache
      if (this.singletons.has(key)) {
        let instance = this.singletons.get(key);
        if (instance === undefined) {
          instance = factory();
          this.singletons.set(key, instance);
        }
        return instance;
      }
      
      // Otherwise, create new instance each time
      return factory();
    }

    throw new Error(`Service '${key}' is not registered`);
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * Get all registered service keys
   */
  getRegisteredKeys(): string[] {
    return [
      ...Array.from(this.services.keys()),
      ...Array.from(this.factories.keys())
    ];
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }

  /**
   * Create a scoped container that inherits from parent
   */
  createScope(): DIContainer {
    const scope = new DIContainer();
    
    // Copy all registrations to the scope
    for (const [key, value] of this.services) {
      scope.services.set(key, value);
    }
    for (const [key, factory] of this.factories) {
      scope.factories.set(key, factory);
    }
    for (const [key, value] of this.singletons) {
      scope.singletons.set(key, value);
    }
    
    return scope;
  }
}

/**
 * Service registry with type-safe keys
 */
export class ServiceRegistry {
  private static readonly KEYS = {
    DATABASE: 'database',
    LOGGER: 'logger',
    PERMISSIONS: 'permissions',
    COMMAND_HANDLER: 'commandHandler',
  } as const;

  static get Keys() {
    return this.KEYS;
  }

  /**
   * Get a typed key for a service
   */
  static key<T extends string>(name: T): T {
    return name;
  }
}

/**
 * Dependency injection decorator for automatic service resolution
 */
export function Injectable(dependencies: string[] = []) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        // If a container is passed as first argument, resolve dependencies
        if (args[0] instanceof DIContainer) {
          const container = args[0] as DIContainer;
          const resolvedDeps = dependencies.map(dep => container.resolve(dep));
          super(...resolvedDeps);
        } else {
          // Fallback to original constructor
          super(...args);
        }
      }
    };
  };
}

/**
 * Command dependencies interface
 */
export interface CommandDependencies {
  [key: string]: any;
}

/**
 * Base command constructor type
 */
export type CommandConstructor<T extends CommandDependencies = CommandDependencies> = 
  new (deps: T) => any;