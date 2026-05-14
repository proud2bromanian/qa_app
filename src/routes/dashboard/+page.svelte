<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let proiecte: any[] = [];
  let incarcare = true;

  onMount(async () => {
    try {
      const r = await fetch('/api/projects');
      proiecte = await r.json();
      if (!Array.isArray(proiecte)) proiecte = [];
    } catch { proiecte = []; }
    incarcare = false;
  });

  $: totalTeste = proiecte.reduce((a, b) => a + (b._count?.teste || 0), 0);
  $: totalSuite = proiecte.reduce((a, b) => a + (b._count?.suite || 0), 0);
  $: totalMembri = proiecte.reduce((a, b) => a + (b._count?.membri || 0), 0);
</script>

<div class="space-y-6">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
      <div class="mt-1.5 flex items-center gap-3 text-xs font-mono text-slate-400 tracking-wide">
        <span>{proiecte.length} proiecte</span>
        <span class="text-slate-200">|</span>
        <span>{totalTeste} teste</span>
        <span class="text-slate-200">|</span>
        <span>{totalMembri} membri</span>
      </div>
    </div>
    <a href="/projects/create" class="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer">
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      Proiect Nou
    </a>
  </div>

  <!-- Stats -->
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div class="rounded-md border border-slate-200 bg-white px-4 py-4">
      <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Proiecte active</p>
      <p class="mt-1 text-2xl font-bold font-mono text-slate-900 tabular-nums">{proiecte.length}</p>
    </div>
    <div class="rounded-md border border-slate-200 bg-white px-4 py-4">
      <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Cazuri de test</p>
      <p class="mt-1 text-2xl font-bold font-mono text-slate-900 tabular-nums">{totalTeste}</p>
    </div>
    <div class="rounded-md border border-slate-200 bg-white px-4 py-4">
      <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Suite de teste</p>
      <p class="mt-1 text-2xl font-bold font-mono text-slate-900 tabular-nums">{totalSuite}</p>
    </div>
    <div class="rounded-md border border-slate-200 bg-white px-4 py-4">
      <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Membri total</p>
      <p class="mt-1 text-2xl font-bold font-mono text-slate-900 tabular-nums">{totalMembri}</p>
    </div>
  </div>

  <!-- Projects List -->
  <div class="rounded-md border border-slate-200 bg-white">
    <div class="border-b border-slate-100 px-5 py-3">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Proiectele mele</h3>
    </div>

    {#if incarcare}
      <div class="py-12 text-center">
        <div class="inline-flex items-center gap-2 text-sm text-slate-400">
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Se încarcă...
        </div>
      </div>
    {:else if proiecte.length === 0}
      <div class="py-16 text-center">
        <p class="text-sm text-slate-500">Nu aveți încă niciun proiect</p>
        <a href="/projects/create" class="mt-4 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Creează primul proiect
        </a>
      </div>
    {:else}
      <div class="divide-y divide-slate-100">
        {#each proiecte as p (p.id)}
          <button on:click={() => goto(`/projects/${p.id}`)} class="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors group">
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-800 group-hover:text-slate-900">{p.nume}</p>
              <div class="mt-0.5 flex items-center gap-3 text-xs font-mono text-slate-400">
                <span>{p._count?.membri || 0} membri</span>
                <span class="text-slate-200">·</span>
                <span>{p._count?.teste || 0} teste</span>
                <span class="text-slate-200">·</span>
                <span>{p._count?.suite || 0} suite</span>
              </div>
            </div>
            <svg class="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
