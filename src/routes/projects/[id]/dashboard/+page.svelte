<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let proiect: any = null;
  let stats: any = null;
  let incarcare = true;
  let eroare = '';

  const projectId = $page.params.id;

  onMount(async () => {
    try {
      const [p, d] = await Promise.all([
        fetch(`/api/projects/${projectId}`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/dashboard`).then(r => r.json())
      ]);
      if (p.error) { eroare = p.error; return; }
      proiect = p; stats = d;
    } catch { eroare = 'Eroare la încărcare'; }
    incarcare = false;
  });

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function statusCuloare(status: string): string {
    if (status === 'finalizat' || status === 'complet') return 'bg-emerald-400';
    if (status === 'in_progres') return 'bg-amber-400';
    return 'bg-slate-300';
  }

  function statusLabel(status: string): string {
    if (status === 'finalizat' || status === 'complet') return 'Finalizat';
    if (status === 'in_progres') return 'În curs';
    return status;
  }

  $: passRate = stats?.stats?.passRate || 0;
  $: recent = stats?.recentExecutions || [];
</script>

<div class="space-y-6">
  {#if eroare}
    <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{eroare}</div>
  {:else if incarcare}
    <div class="py-20 text-center">
      <div class="inline-flex items-center gap-2 text-sm text-slate-400">
        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Se încarcă...
      </div>
    </div>
  {:else}
    <!-- Project Header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">{proiect.nume}</h1>
      {#if proiect.descriere}
        <p class="mt-1 text-sm text-slate-400">{proiect.descriere}</p>
      {/if}
    </div>

    <!-- Stat Cards -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Total Tests -->
      <div class="rounded-md border border-slate-200 bg-white px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Teste</p>
            <p class="mt-1 text-2xl font-bold font-mono text-slate-900 tabular-nums">{stats?.totalTests || 0}</p>
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100">
            <svg class="h-4.5 w-4.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
        </div>
      </div>

      <!-- Suites -->
      <div class="rounded-md border border-slate-200 bg-white px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Suite de Teste</p>
            <p class="mt-1 text-2xl font-bold font-mono text-slate-900 tabular-nums">{stats?.suite || 0}</p>
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50">
            <svg class="h-4.5 w-4.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          </div>
        </div>
      </div>

      <!-- Active Bugs -->
      <div class="rounded-md border border-slate-200 bg-white px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Bug-uri Active</p>
            <p class="mt-1 text-2xl font-bold font-mono tabular-nums {(stats?.buguriActive || 0) > 0 ? 'text-rose-600' : 'text-slate-900'}">{stats?.buguriActive || 0}</p>
            {#if (stats?.buguriTotal || 0) > 0}
              <p class="text-xs text-slate-300 font-mono">din {stats.buguriTotal} total</p>
            {/if}
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-md {(stats?.buguriActive || 0) > 0 ? 'bg-rose-50' : 'bg-slate-100'}">
            <svg class="h-4.5 w-4.5 {(stats?.buguriActive || 0) > 0 ? 'text-rose-500' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>
      </div>

      <!-- Executions -->
      <div class="rounded-md border border-slate-200 bg-white px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Execuții Rulate</p>
            <p class="mt-1 text-2xl font-bold font-mono text-slate-900 tabular-nums">{stats?.executii || 0}</p>
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50">
            <svg class="h-4.5 w-4.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Quality Overview -->
    {#if stats?.stats && stats.stats.totalRezultate > 0}
      <div class="rounded-md border border-slate-200 bg-white p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Starea Calității</h3>
          <span class="text-2xl font-bold font-mono tabular-nums {passRate >= 80 ? 'text-emerald-600' : passRate >= 50 ? 'text-amber-600' : 'text-rose-600'}">{passRate}%</span>
        </div>

        <!-- Progress Bar -->
        <div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
          {#if stats.stats.trecute > 0}
            <div class="h-full bg-emerald-500 transition-all" style="width: {stats.stats.passRate}%"></div>
          {/if}
          {#if stats.stats.esuate > 0}
            <div class="h-full bg-rose-500 transition-all" style="width: {stats.stats.failRate}%"></div>
          {/if}
          {#if stats.stats.blocate > 0}
            <div class="h-full bg-amber-500 transition-all" style="width: {stats.stats.blocatRate}%"></div>
          {/if}
          {#if stats.stats.netestate > 0}
            <div class="h-full bg-slate-300 transition-all" style="width: {stats.stats.netestatRate}%"></div>
          {/if}
        </div>

        <!-- Legend -->
        <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div class="flex items-center gap-2 rounded bg-emerald-50/50 border border-emerald-100 px-3 py-2">
            <span class="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span class="text-xs font-mono text-emerald-700 tabular-nums">{stats.stats.trecute}</span>
            <span class="text-xs text-emerald-600">Trecute {stats.stats.passRate}%</span>
          </div>
          <div class="flex items-center gap-2 rounded bg-rose-50/50 border border-rose-100 px-3 py-2">
            <span class="h-2 w-2 rounded-full bg-rose-500 shrink-0"></span>
            <span class="text-xs font-mono text-rose-700 tabular-nums">{stats.stats.esuate}</span>
            <span class="text-xs text-rose-600">Eșuate {stats.stats.failRate}%</span>
          </div>
          <div class="flex items-center gap-2 rounded bg-amber-50/50 border border-amber-100 px-3 py-2">
            <span class="h-2 w-2 rounded-full bg-amber-500 shrink-0"></span>
            <span class="text-xs font-mono text-amber-700 tabular-nums">{stats.stats.blocate}</span>
            <span class="text-xs text-amber-600">Blocate {stats.stats.blocatRate}%</span>
          </div>
          <div class="flex items-center gap-2 rounded bg-slate-50 border border-slate-100 px-3 py-2">
            <span class="h-2 w-2 rounded-full bg-slate-400 shrink-0"></span>
            <span class="text-xs font-mono text-slate-600 tabular-nums">{stats.stats.netestate}</span>
            <span class="text-xs text-slate-500">Netestate {stats.stats.netestatRate}%</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Recent Executions -->
    {#if recent.length > 0}
      <div class="rounded-md border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Execuții Recente</h3>
          <a href="/projects/{projectId}/executions" class="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">Vezi toate &rarr;</a>
        </div>
        <div class="divide-y divide-slate-100">
          {#each recent as e (e.id)}
            <a href="/projects/{projectId}/executions/{e.id}" class="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors group">
              <!-- Status dot -->
              <span class="h-2 w-2 rounded-full shrink-0 {statusCuloare(e.status)}"></span>

              <!-- Name & suite -->
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900">{e.nume}</p>
                {#if e.suiteNume}
                  <p class="text-xs text-slate-400">{e.suiteNume}</p>
                {/if}
              </div>

              <!-- Progress -->
              <div class="hidden sm:flex items-center gap-2 shrink-0">
                <div class="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full rounded-full bg-emerald-500 transition-all" style="width: {e.totalTeste > 0 ? Math.round((e.testate / e.totalTeste) * 100) : 0}%"></div>
                </div>
                <span class="text-xs font-mono text-slate-400 tabular-nums">{e.testate}/{e.totalTeste}</span>
              </div>

              <!-- Counts -->
              <div class="hidden md:flex items-center gap-3 shrink-0">
                {#if e.trecute > 0}
                  <span class="text-xs font-mono text-emerald-600 tabular-nums">+{e.trecute}</span>
                {/if}
                {#if e.esuate > 0}
                  <span class="text-xs font-mono text-rose-600 tabular-nums">-{e.esuate}</span>
                {/if}
              </div>

              <!-- Date -->
              <span class="text-xs font-mono text-slate-300 shrink-0">{formatDate(e.createdAt)}</span>

              <!-- Chevron -->
              <svg class="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          {/each}
        </div>
      </div>
    {/if}

  {/if}
</div>
