<script lang="ts">
  export let value = '';
  export let placeholder = 'Caută...';
  export let shortcut = false;
  export let id = '';
</script>

<div class="relative">
  <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
  </svg>
  <input
    {id}
    type="text"
    bind:value
    {placeholder}
    class="block w-full rounded-md border border-slate-200 bg-white pl-9 {shortcut ? 'pr-16' : 'pr-3'} py-2 text-sm font-mono placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
  />
  {#if shortcut}
    <kbd class="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-mono text-slate-400 pointer-events-none">/</kbd>
  {/if}
</div>
