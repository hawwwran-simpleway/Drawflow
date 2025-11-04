import type Drawflow from './Drawflow';
import type { DrawflowEventCallback } from './types';

export function on<T>(context: Drawflow, event: string, callback: DrawflowEventCallback<T>): void {
  if (typeof callback !== 'function') {
    console.error(`The listener callback must be a function, the given type is ${typeof callback}`);
    return;
  }
  if (typeof event !== 'string') {
    console.error(`The event name must be a string, the given type is ${typeof event}`);
    return;
  }
  if (!context.events[event]) {
    context.events[event] = { listeners: [] };
  }
  context.events[event]!.listeners.push(callback);
}

export function removeListener<T>(context: Drawflow, event: string, callback: DrawflowEventCallback<T>): void {
  const registry = context.events[event];
  if (!registry) return;
  const listeners = registry.listeners;
  const index = listeners.indexOf(callback);
  if (index > -1) {
    listeners.splice(index, 1);
  }
}

export function dispatch<T>(context: Drawflow, event: string, details: T): void {
  const registry = context.events[event];
  if (!registry) {
    return;
  }
  registry.listeners.forEach((listener) => listener(details));
}
