<script lang="ts">
  import { toast } from '$lib/stores/toast';
  import { fly } from 'svelte/transition';

  const colors: Record<string, string> = {
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    info: 'bg-slate-900'
  };

  const icons: Record<string, string> = {
    success: 'M5 13l4 4L19 7',
    error: 'M6 18L18 6M6 6l12 12',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  };
</script>

<div class="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
  {#each $toast as t (t.id)}
    <div transition:fly={{ y: 20, duration: 200 }} class="flex items-center gap-2.5 rounded-md {colors[t.type]} px-4 py-3 shadow-lg">
      <svg class="h-4 w-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d={icons[t.type]}/>
      </svg>
      <span class="text-sm text-white font-medium">{t.message}</span>
      <button on:click={() => toast.dismiss(t.id)} class="ml-auto shrink-0 text-white/70 hover:text-white cursor-pointer">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  {/each}
</div>
