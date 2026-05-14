import { writable } from 'svelte/store';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let nextId = 0;

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function add(type: Toast['type'], message: string, duration = 3000) {
    const id = nextId++;
    update((toasts) => [...toasts, { id, type, message }]);
    setTimeout(() => {
      update((toasts) => toasts.filter((t) => t.id !== id));
    }, duration);
  }

  return {
    subscribe,
    success: (msg: string) => add('success', msg),
    error: (msg: string) => add('error', msg, 5000),
    info: (msg: string) => add('info', msg),
    dismiss: (id: number) =>
      update((toasts) => toasts.filter((t) => t.id !== id))
  };
}

export const toast = createToastStore();
