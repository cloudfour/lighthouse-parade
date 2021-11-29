export interface EventMap {
  [eventName: string]: (...args: any[]) => void;
}

export const createEmitter = <Events extends EventMap, Resolve = never>() => {
  let savedResolve: (value: Resolve) => void;
  let savedReject: (value: unknown) => void;

  const emit: Emit = (eventName: string, ...args: unknown[]) => {
    if (eventName === 'resolve') return savedResolve(...(args as [Resolve]));
    if (eventName === 'reject') return savedReject(...(args as [unknown]));
    // Event handlers are executed in a microtask
    // so that if events are fired right before event listeners are added,
    // the new event listeners are fired
    Promise.resolve().then(() => {
      const handlers: Events[keyof Events][] = eventHandlers[eventName] || [];
      for (const handler of handlers) handler(...args);
    });
  };

  const on = <E extends keyof Events>(eventName: E, handler: Events[E]) => {
    (eventHandlers[eventName] ??= [] as Events[E][]).push(handler);
    return emitter; // Allow chaining
  };

  const promise = new Promise<Resolve>((resolve, reject) => {
    savedResolve = resolve;
    savedReject = reject;
  });
  const eventHandlers: { [E in keyof Events]?: Events[E][] } = {};
  interface Emit {
    <E extends keyof Events>(
      eventName: E,
      ...args: Parameters<Events[E]>
    ): void;
    (eventName: 'resolve', value?: Resolve): void;
    (eventName: 'reject', value?: unknown): void;
  }

  const emitter = { promise, on, emit };
  return emitter;
};
