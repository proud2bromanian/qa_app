<script lang="ts">
  import { afterUpdate, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/stores/toast';

  let suite: any[] = [];
  let incarcare = true;
  let eroare = '';
  let searchTerm = '';
  let sortBy: 'nume' | 'teste' | 'data' = 'nume';
  let nextCursor: string | null = null;
  let totalSuite = 0;
  let totalFiltrat = 0;
  let totalTesteAcoperite = 0;
  let suiteCuExecutii = 0;
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

  let showModal = false;
  let editId: string | null = null;
  let suiteNume = '';
  let suiteDescriere = '';

  const projectId = $page.params.id;

  function buildSuiteParams(options: { cursor?: string | null } = {}) {
    const params = new URLSearchParams({
      take: String(PAGE_SIZE),
      sort: sortBy
    });
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
      const params = buildSuiteParams({ cursor: append ? nextCursor : null });
      const r = await fetch(`/api/projects/${projectId}/test-suites?${params.toString()}`);
      if (!r.ok) throw new Error('Eroare la încărcare');

      const result = await r.json();
      if (requestId !== loadRequestId) return;

      const data = result.data || [];
      if (append) {
        const idsExistente = new Set(suite.map(s => s.id));
        suite = [...suite, ...data.filter((s: any) => !idsExistente.has(s.id))];
      } else {
        suite = data;
      }
      nextCursor = result.nextCursor || null;
      totalFiltrat = result.total || 0;
      totalSuite = result.totalAll ?? result.total ?? 0;
      totalTesteAcoperite = result.totalTesteAcoperite || 0;
      suiteCuExecutii = result.suiteCuExecutii || 0;
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

  function ultimaExecutie(s: any): any | null {
    return s.executii?.[0] || null;
  }

  function statusCuloare(status: string): string {
    if (status === 'finalizat' || status === 'complet') return 'bg-emerald-400';
    if (status === 'in_progres') return 'bg-amber-400';
    return 'bg-slate-300';
  }

  function statusLabel(status: string): string {
    if (status === 'finalizat' || status === 'complet') return 'Finalizat';
    if (status === 'in_progres') return 'În curs';
    return 'Netestat';
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  $: suiteFiltrate = suite;
  $: filtreActive = !!searchTerm.trim();
  $: queryKey = `${searchTerm}|${sortBy}`;
  $: if (mounted && queryKey !== currentQueryKey) {
    currentQueryKey = queryKey;
    scheduleReload();
  }

  function deschideModal(s?: any) {
    if (s) {
      editId = s.id;
      suiteNume = s.nume;
      suiteDescriere = s.descriere || '';
    } else {
      editId = null;
      suiteNume = '';
      suiteDescriere = '';
    }
    showModal = true;
  }

  function inchideModal() {
    suiteNume = ''; suiteDescriere = ''; editId = null; showModal = false;
  }

  async function salveazaSuite() {
    if (!suiteNume.trim()) return;
    if (editId) {
      await fetch(`/api/projects/${projectId}/test-suites/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nume: suiteNume, descriere: suiteDescriere })
      });
    } else {
      await fetch(`/api/projects/${projectId}/test-suites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nume: suiteNume, descriere: suiteDescriere })
      });
    }
    inchideModal();
    toast.success(editId ? 'Suita actualizată' : 'Suită creată');
    await incarca();
  }

  async function stergeSuita(id: string) {
    if (!confirm('Sigur doriți să ștergeți această suită?')) return;
    await fetch(`/api/projects/${projectId}/test-suites/${id}`, { method: 'DELETE' });
    await incarca();
  }

  async function startExecutie(suiteId: string) {
    const r = await fetch(`/api/projects/${projectId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suiteId })
    });
    const data = await r.json();
    if (data.error) { toast.error(data.error); return; }
    goto(`/projects/${projectId}/executions/${data.id}`);
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      searchTerm = '';
      (e.target as HTMLInputElement).blur();
    }
  }
</script>

<svelte:window on:keydown={(e) => {
  if (e.key === '/' && !showModal && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'SELECT') {
    e.preventDefault();
    document.getElementById('suite-search')?.focus();
  }
}} />

<div class="space-y-5">
  <!-- Header -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Suite de Teste</h1>
      <div class="mt-1.5 flex items-center gap-3 text-xs font-mono text-slate-400 tracking-wide">
        <span>{totalSuite || suite.length} suite</span>
        <span class="text-slate-200">|</span>
        <span class="text-amber-600">{totalTesteAcoperite} teste acoperite</span>
        <span class="text-slate-200">|</span>
        <span>{suiteCuExecutii} executate</span>
        {#if filtreActive}
          <span class="text-slate-200">|</span>
          <span class="text-amber-600">{totalFiltrat} rezultate</span>
        {/if}
      </div>
    </div>
    <button on:click={() => deschideModal()} class="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer">
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      Suită Nouă
    </button>
  </div>

  <!-- Search & Sort -->
  <div class="flex items-center gap-3">
    <div class="relative flex-1 max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input
        id="suite-search"
        type="text"
        bind:value={searchTerm}
        on:keydown={handleSearchKeydown}
        placeholder="Caută după nume sau descriere..."
        class="block w-full rounded-md border border-slate-200 bg-white pl-9 pr-16 py-2 text-sm font-mono placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
      />
      <kbd class="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-mono text-slate-400 pointer-events-none">/</kbd>
    </div>
    <div class="h-8 w-px bg-slate-200"></div>
    <select bind:value={sortBy} class="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer">
      <option value="nume">Sortare: Nume</option>
      <option value="teste">Sortare: Nr. teste</option>
      <option value="data">Sortare: Ultima execuție</option>
    </select>
  </div>

  <!-- Suite Cards -->
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
  {:else if totalSuite === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-20 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
        <svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
      </div>
      <p class="text-sm font-medium text-slate-600">Nicio suită în acest proiect</p>
      <p class="mt-1 text-xs text-slate-400">Grupați teste în suite pentru a le rula împreună</p>
      <button on:click={() => deschideModal()} class="mt-5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Creează prima suită
      </button>
    </div>
  {:else if suiteFiltrate.length === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
      <p class="text-sm text-slate-500">Nicio suită nu corespunde căutării</p>
      <button on:click={() => searchTerm = ''} class="mt-3 text-xs font-medium text-slate-600 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500 cursor-pointer">
        Resetează căutarea
      </button>
    </div>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each suiteFiltrate as s (s.id)}
        {@const exec = ultimaExecutie(s)}
        {@const testCount = s._count?.teste || 0}
        <div class="group rounded-md border border-slate-200 border-l-[3px] border-l-amber-400 bg-white hover:border-slate-300 transition-colors">
          <!-- Card Body -->
          <div class="px-4 pt-4 pb-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <a href="/projects/{projectId}/test-suites/{s.id}" class="text-sm font-semibold text-slate-800 hover:text-slate-900 hover:underline underline-offset-2 decoration-slate-300 transition-colors">
                  {s.nume}
                </a>
                {#if s.descriere}
                  <p class="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">{s.descriere}</p>
                {/if}
              </div>
            </div>
          </div>

          <!-- Card Meta -->
          <div class="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Test count -->
              <span class="inline-flex items-center gap-1 text-xs font-mono {testCount > 0 ? 'text-amber-600' : 'text-slate-300'}">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                {testCount} {testCount === 1 ? 'test' : 'teste'}
              </span>

              <!-- Last execution -->
              {#if exec}
                <span class="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400">
                  <span class="h-1.5 w-1.5 rounded-full {statusCuloare(exec.status)}"></span>
                  {statusLabel(exec.status)}
                </span>
              {:else}
                <span class="text-xs font-mono text-slate-300">Neexecutată</span>
              {/if}
            </div>

            <!-- Actions -->
            <div class="flex items-center">
              <button on:click|stopPropagation={() => startExecutie(s.id)} title="Rulează suita" class="flex h-6 w-6 items-center justify-center rounded text-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer">
                <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </button>
              <button on:click|stopPropagation={() => deschideModal(s)} title="Editează" class="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button on:click|stopPropagation={() => stergeSuita(s.id)} title="Șterge" class="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
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
      <span class="text-xs font-mono text-slate-300">{suite.length} din {totalFiltrat} suite</span>
    </div>
  {/if}
</div>

<!-- Modal -->
{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" tabindex="-1" on:click={inchideModal} on:keydown={(e) => { if (e.key === 'Escape') inchideModal(); }}>
    <div class="w-full max-w-lg rounded-lg bg-white shadow-2xl" on:click|stopPropagation>
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h3 class="text-sm font-semibold text-slate-900">{editId ? 'Editează Suită' : 'Suită Nouă'}</h3>
        <button on:click={inchideModal} class="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="space-y-4 px-6 py-5">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="suiteNume">Nume *</label>
          <input id="suiteNume" type="text" bind:value={suiteNume} class="block w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" placeholder="Ex: Suite de regresie" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="suiteDesc">Descriere</label>
          <textarea id="suiteDesc" bind:value={suiteDescriere} class="block w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" rows={2} placeholder="Descriere opțională a suitei"></textarea>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
        <button on:click={inchideModal} class="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">Anulează</button>
        <button on:click={salveazaSuite} class="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer">
          {editId ? 'Salvează' : 'Creează'}
        </button>
      </div>
    </div>
  </div>
{/if}
