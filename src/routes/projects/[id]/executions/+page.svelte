<script lang="ts">
  import { afterUpdate, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/stores/toast';

  let executii: any[] = [];
  let suite: any[] = [];
  let incarcare = true;
  let eroare = '';
  let selectedSuiteId = '';
  let searchTerm = '';
  let showDeleteModal = false;
  let deleteExecId = '';
  let nextCursor: string | null = null;
  let totalExecutii = 0;
  let totalFiltrat = 0;
  let totalInProgres = 0;
  let loadingMore = false;
  const PAGE_SIZE = 50;
  let mounted = false;
  let queryKey = '';
  let currentQueryKey = '';
  let reloadTimer: ReturnType<typeof setTimeout> | null = null;
  let loadRequestId = 0;
  let sentinelEl: HTMLDivElement | null = null;
  let observedSentinel: HTMLDivElement | null = null;
  let loadMoreObserver: IntersectionObserver | null = null;

  const projectId = $page.params.id;

  function buildExecutionParams(options: { cursor?: string | null } = {}) {
    const params = new URLSearchParams({ take: String(PAGE_SIZE) });
    if (options.cursor) params.set('cursor', options.cursor);
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    return params;
  }

  async function incarca(options: { append?: boolean } = {}) {
    const append = options.append === true;
    const requestId = ++loadRequestId;
    if (append) loadingMore = true;
    else {
      incarcare = true;
      nextCursor = null;
    }

    try {
      const params = buildExecutionParams({ cursor: append ? nextCursor : null });
      const [e, s] = await Promise.all([
        fetch(`/api/projects/${projectId}/executions?${params.toString()}`).then(r => {
          if (!r.ok) throw new Error('Eroare la încărcarea execuțiilor');
          return r.json();
        }),
        append
          ? Promise.resolve(null)
          : fetch(`/api/projects/${projectId}/test-suites?selectOptions=1`).then(r => {
            if (!r.ok) throw new Error('Eroare la încărcarea suitelor');
            return r.json();
          })
      ]);

      if (requestId !== loadRequestId) return;
      const data = e.data || [];
      if (append) {
        const idsExistente = new Set(executii.map(ex => ex.id));
        executii = [...executii, ...data.filter((ex: any) => !idsExistente.has(ex.id))];
      } else {
        executii = data;
      }
      nextCursor = e.nextCursor || null;
      totalFiltrat = e.total || 0;
      totalExecutii = e.totalAll ?? e.total ?? 0;
      totalInProgres = e.totalInProgres || 0;
      if (s) suite = s.data || [];
      eroare = '';
    } catch {
      if (requestId === loadRequestId) eroare = 'Eroare la încărcare';
    } finally {
      if (requestId === loadRequestId) {
        incarcare = false;
        loadingMore = false;
      }
    }
  }

  onMount(() => {
    mounted = true;
    currentQueryKey = queryKey;
    loadMoreObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some(entry => entry.isIntersecting)) incarcaUrmatoarele();
      },
      { rootMargin: '600px 0px' }
    );
    incarca();
    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      if (loadMoreObserver) loadMoreObserver.disconnect();
    };
  });

  afterUpdate(() => {
    observeSentinel();
    maybeLoadMoreFromScroll();
  });

  function scheduleReload() {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      incarca();
    }, 250);
  }

  function observeSentinel() {
    if (!loadMoreObserver || sentinelEl === observedSentinel) return;
    if (observedSentinel) loadMoreObserver.unobserve(observedSentinel);
    observedSentinel = sentinelEl;
    if (observedSentinel) loadMoreObserver.observe(observedSentinel);
  }

  function maybeLoadMoreFromScroll() {
    if (!sentinelEl || !nextCursor || loadingMore || incarcare) return;
    const rect = sentinelEl.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 600) incarcaUrmatoarele();
  }

  function incarcaUrmatoarele() {
    if (!nextCursor || loadingMore || incarcare) return;
    incarca({ append: true });
  }

  async function startExecutie() {
    if (!selectedSuiteId) { toast.error('Selectați o suită'); return; }
    const r = await fetch(`/api/projects/${projectId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suiteId: selectedSuiteId })
    });
    const data = await r.json();
    if (data.error) { toast.error(data.error); return; }
    goto(`/projects/${projectId}/executions/${data.id}`);
  }

  async function ruleazaDinNouEsate(execId: string) {
    if (!confirm('Creați o nouă execuție doar cu testele eșuate/blocate?')) return;
    const r = await fetch(`/api/projects/${projectId}/executions/${execId}`);
    const exec = await r.json();
    if (exec.error) { toast.error(exec.error); return; }
    const esuate = exec.rezultate?.filter((r: any) => r.status === 'esuat' || r.status === 'blocat') || [];
    if (esuate.length === 0) { toast.info('Nu există teste eșuate sau blocate.'); return; }
    const r2 = await fetch(`/api/projects/${projectId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nume: `Reluare ${esuate.length} teste eșuate ${new Date().toLocaleDateString('ro-RO')}`,
        testIds: esuate.map((r: any) => r.testId),
        suiteId: exec.suiteId
      })
    });
    const data = await r2.json();
    if (data.error) { toast.error(data.error); return; }
    goto(`/projects/${projectId}/executions/${data.id}`);
  }

  function confirmaStergere(execId: string) {
    deleteExecId = execId;
    showDeleteModal = true;
  }

  async function stergeExecutie() {
    if (!deleteExecId) return;
    const r = await fetch(`/api/projects/${projectId}/executions/${deleteExecId}`, { method: 'DELETE' });
    const data = await r.json();
    if (data.error) { toast.error(data.error); return; }
    showDeleteModal = false;
    deleteExecId = '';
    toast.success('Execuție ștearsă');
    await incarca();
  }

  function statusCuloare(status: string): string {
    if (status === 'in_progres') return 'border-l-amber-400';
    if (status === 'finalizat' || status === 'complet') return 'border-l-emerald-400';
    return 'border-l-slate-300';
  }

  function statusDot(status: string): string {
    if (status === 'in_progres') return 'bg-amber-400';
    if (status === 'finalizat' || status === 'complet') return 'bg-emerald-400';
    return 'bg-slate-300';
  }

  function statusLabel(status: string): string {
    const labels: Record<string, string> = { finalizat: 'Finalizat', complet: 'Complet', in_progres: 'În curs', netestat: 'Netestat' };
    return labels[status] || status;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  $: executiiFiltrate = executii;
  $: filtreActive = !!searchTerm.trim();
  $: queryKey = searchTerm;
  $: if (mounted && queryKey !== currentQueryKey) {
    currentQueryKey = queryKey;
    scheduleReload();
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      searchTerm = '';
      (e.target as HTMLInputElement).blur();
    }
  }
</script>

<div class="space-y-5">
  <!-- Header -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Execuții</h1>
      <div class="mt-1.5 flex items-center gap-3 text-xs font-mono text-slate-400 tracking-wide">
        <span>{totalExecutii || executii.length} total</span>
        {#if totalInProgres > 0}
          <span class="text-slate-200">|</span>
          <span class="text-amber-600">{totalInProgres} în curs</span>
        {/if}
        {#if filtreActive}
          <span class="text-slate-200">|</span>
          <span class="text-amber-600">{totalFiltrat} rezultate</span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Quick Launch -->
  <div class="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3">
    <svg class="h-4 w-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    <select bind:value={selectedSuiteId} class="block flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer">
      <option value="">Selectați o suită...</option>
      {#each suite as s}
        <option value={s.id}>{s.nume} ({s._count?.teste || 0} teste)</option>
      {/each}
    </select>
    <button on:click={startExecutie} disabled={!selectedSuiteId} class="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
      <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      Lansează
    </button>
  </div>

  <!-- Search -->
  {#if totalExecutii > 0 || searchTerm}
    <div class="relative max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input
        type="text"
        bind:value={searchTerm}
        on:keydown={handleSearchKeydown}
        placeholder="Caută execuții..."
        class="block w-full rounded-md border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm font-mono placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
      />
    </div>
  {/if}

  <!-- Executions List -->
  {#if incarcare}
    <div class="py-16 text-center">
      <div class="inline-flex items-center gap-2 text-sm text-slate-400">
        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Se încarcă...
      </div>
    </div>
  {:else if eroare}
    <div class="rounded-lg border border-red-100 bg-red-50/70 py-12 text-center">
      <p class="text-sm font-medium text-red-700">{eroare}</p>
      <button on:click={() => incarca()} class="mt-3 text-xs font-semibold text-red-700 underline underline-offset-2 decoration-red-300 hover:decoration-red-600 cursor-pointer">
        Reîncearcă
      </button>
    </div>
  {:else if totalExecutii === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-20 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
        <svg class="h-6 w-6 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </div>
      <p class="text-sm font-medium text-slate-600">Nicio execuție încă</p>
      <p class="mt-1 text-xs text-slate-400">Selectați o suită și lansați prima execuție</p>
    </div>
  {:else if executiiFiltrate.length === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
      <p class="text-sm text-slate-500">Nicio execuție nu corespunde căutării</p>
      <button on:click={() => searchTerm = ''} class="mt-3 text-xs font-medium text-slate-600 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500 cursor-pointer">
        Resetează căutarea
      </button>
    </div>
  {:else}
    <div class="space-y-1.5">
      {#each executiiFiltrate as e (e.id)}
        {@const progress = e.totalTeste > 0 ? Math.round((e.testate / e.totalTeste) * 100) : 0}
        <div class="group rounded-md border border-slate-200 bg-white {statusCuloare(e.status)} border-l-[3px] hover:border-slate-300 transition-colors">
          <div class="flex items-center gap-4 px-4 py-3">
            <!-- Status Dot -->
            <span class="h-2 w-2 rounded-full shrink-0 {statusDot(e.status)}"></span>

            <!-- Name + Suite -->
            <div class="min-w-0 flex-1">
              <a href="/projects/{projectId}/executions/{e.id}" class="text-sm font-medium text-slate-800 hover:text-slate-900 hover:underline underline-offset-2 decoration-slate-300 transition-colors">
                {e.nume}
              </a>
              {#if e.suite?.nume}
                <span class="ml-2 text-xs text-slate-400 font-mono">{e.suite.nume}</span>
              {/if}
            </div>

            <!-- Status Badge -->
            <span class="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider {e.status === 'in_progres' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}">
              {statusLabel(e.status)}
            </span>

            <!-- Progress -->
            <div class="hidden sm:flex items-center gap-2 shrink-0">
              <div class="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full bg-emerald-500 transition-all" style="width: {progress}%"></div>
              </div>
              <span class="text-xs font-mono text-slate-400 tabular-nums">{e.testate}/{e.totalTeste}</span>
            </div>

            <!-- Date -->
            <span class="hidden md:block text-xs font-mono text-slate-300 shrink-0">{formatDate(e.createdAt)}</span>

            <!-- Actions -->
            <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button on:click|stopPropagation={() => ruleazaDinNouEsate(e.id)} title="Retestează eșuate" class="flex h-6 w-6 items-center justify-center rounded text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              </button>
              {#if $page.data.rolCurent === 'administrator'}
                <button on:click|stopPropagation={() => confirmaStergere(e.id)} title="Șterge" class="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              {/if}
            </div>

            <!-- Chevron -->
            <a href="/projects/{projectId}/executions/{e.id}" class="shrink-0">
              <svg class="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      {/each}
    </div>

    <!-- Footer -->
    <div class="pt-2 text-center">
      {#if nextCursor}
        <div class="pb-3">
          <div bind:this={sentinelEl} class="flex min-h-8 items-center justify-center">
            {#if loadingMore}
              <div class="inline-flex items-center gap-2 text-xs text-slate-400">
                <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Se încarcă...
              </div>
            {/if}
          </div>
        </div>
      {/if}
      <span class="text-xs font-mono text-slate-300">{executii.length} din {totalFiltrat} execuții</span>
    </div>
  {/if}
</div>

<!-- Delete Modal -->
{#if showDeleteModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" tabindex="-1" on:click={() => showDeleteModal = false} on:keydown={(e) => { if (e.key === 'Escape') showDeleteModal = false; }}>
    <div class="w-full max-w-md rounded-lg bg-white shadow-2xl" on:click|stopPropagation>
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h3 class="text-sm font-semibold text-slate-900">Șterge execuția</h3>
        <button on:click={() => showDeleteModal = false} class="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="px-6 py-5">
        <p class="text-sm text-slate-600">Sigur doriți să ștergeți această execuție? Acțiunea este ireversibilă.</p>
      </div>
      <div class="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
        <button on:click={() => showDeleteModal = false} class="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">Anulează</button>
        <button on:click={stergeExecutie} class="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer">Șterge</button>
      </div>
    </div>
  </div>
{/if}
