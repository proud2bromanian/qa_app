<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let proiecte: any[] = [];
  let incarcare = true;
  let searchTerm = '';

  onMount(async () => {
    const r = await fetch('/api/projects');
    proiecte = await r.json();
    if (!Array.isArray(proiecte)) proiecte = [];
    incarcare = false;
  });

  $: proiecteFiltrate = proiecte.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.nume?.toLowerCase().includes(term) || p.descriere?.toLowerCase().includes(term);
  });

  $: totalTeste = proiecte.reduce((a, b) => a + (b._count?.teste || 0), 0);
</script>

<div class="space-y-5">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Proiecte</h1>
      <div class="mt-1.5 flex items-center gap-3 text-xs font-mono text-slate-400 tracking-wide">
        <span>{proiecte.length} proiecte</span>
        <span class="text-slate-200">|</span>
        <span>{totalTeste} teste total</span>
      </div>
    </div>
    <a href="/projects/create" class="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer">
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      Proiect Nou
    </a>
  </div>

  {#if proiecte.length > 3}
    <div class="relative max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" bind:value={searchTerm} placeholder="Caută proiect..." class="block w-full rounded-md border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm font-mono placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" />
    </div>
  {/if}

  {#if incarcare}
    <div class="py-16 text-center">
      <div class="inline-flex items-center gap-2 text-sm text-slate-400">
        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Se încarcă...
      </div>
    </div>
  {:else if proiecte.length === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-20 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
        <svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/></svg>
      </div>
      <p class="text-sm font-medium text-slate-600">Niciun proiect disponibil</p>
      <a href="/projects/create" class="mt-5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Creează primul proiect
      </a>
    </div>
  {:else if proiecteFiltrate.length === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
      <p class="text-sm text-slate-500">Niciun proiect nu corespunde căutării</p>
      <button on:click={() => searchTerm = ''} class="mt-3 text-xs font-medium text-slate-600 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500 cursor-pointer">Resetează</button>
    </div>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each proiecteFiltrate as p (p.id)}
        <button on:click={() => goto(`/projects/${p.id}`)} class="rounded-md border border-slate-200 bg-white p-4 text-left hover:border-slate-300 transition-colors group">
          <h3 class="text-sm font-semibold text-slate-800 group-hover:text-slate-900">{p.nume}</h3>
          {#if p.descriere}
            <p class="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">{p.descriere}</p>
          {:else}
            <p class="mt-1 text-xs text-slate-300">Fără descriere</p>
          {/if}
          <div class="mt-3 flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>{p._count?.membri || 0} membri</span>
            <span class="text-slate-200">·</span>
            <span>{p._count?.teste || 0} teste</span>
            <span class="text-slate-200">·</span>
            <span>{p._count?.suite || 0} suite</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>
