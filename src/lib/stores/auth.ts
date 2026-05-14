import { writable } from 'svelte/store';

export const currentUser = writable<{ id: string; email: string; nume: string } | null>(null);
