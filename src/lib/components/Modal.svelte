<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let title = '';
  export let open = false;

  const dispatch = createEventDispatcher<{ close: void }>();

  function close() {
    open = false;
    dispatch('close');
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    on:click={close}
    on:keydown={(e) => { if (e.key === 'Escape') close(); }}
  >
    <div class="w-full max-w-lg rounded-lg bg-white shadow-2xl" on:click|stopPropagation>
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h3 class="text-sm font-semibold text-slate-900">{title}</h3>
        <button on:click={close} class="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="px-6 py-5">
        <slot name="body" />
      </div>
      <div class="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
        <slot name="actions" />
      </div>
    </div>
  </div>
{/if}
