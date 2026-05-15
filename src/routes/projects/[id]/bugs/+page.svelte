<script lang="ts">
  import { afterUpdate, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { slide } from 'svelte/transition';
  import { toast } from '$lib/stores/toast';

  let buguri: any[] = [];
  let incarcare = true;
  let eroare = '';
  let searchTerm = '';
  let filtruStatus = '';
  let filtruSeveritate = '';
  let expandedCards: string[] = [];
  let showStergeTot = false;
  let nextCursor: string | null = null;
  let totalBuguri = 0;
  let totalFiltrat = 0;
  let loadingMore = false;
  let countDeschise = 0;
  let countInLucru = 0;
  let countRezolvate = 0;
  let countInchise = 0;
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

  const statusConfig: Record<string, { label: string; dot: string; badge: string; border: string; select: string }> = {
    deschis: {
      label: 'DESCHIS',
      dot: 'bg-rose-400',
      badge: 'bg-rose-50 text-rose-700',
      border: 'border-l-rose-400',
      select: 'border-rose-200 bg-rose-50 text-rose-700'
    },
    in_lucru: {
      label: 'ÎN LUCRU',
      dot: 'bg-amber-400',
      badge: 'bg-amber-50 text-amber-700',
      border: 'border-l-amber-400',
      select: 'border-amber-200 bg-amber-50 text-amber-700'
    },
    rezolvat: {
      label: 'REZOLVAT',
      dot: 'bg-sky-400',
      badge: 'bg-sky-50 text-sky-700',
      border: 'border-l-sky-400',
      select: 'border-sky-200 bg-sky-50 text-sky-700'
    },
    inchis: {
      label: 'ÎNCHIS',
      dot: 'bg-emerald-400',
      badge: 'bg-emerald-50 text-emerald-700',
      border: 'border-l-emerald-400',
      select: 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }
  };

  function cfg(status: string) {
    return statusConfig[status] || statusConfig.deschis;
  }

  const sevConfig: Record<string, { label: string; badge: string }> = {
    critica: { label: 'CRITICĂ', badge: 'bg-rose-100 text-rose-700' },
    majora: { label: 'MAJORĂ', badge: 'bg-orange-100 text-orange-700' },
    moderata: { label: 'MODERATĂ', badge: 'bg-amber-100 text-amber-700' },
    minora: { label: 'MINORĂ', badge: 'bg-slate-100 text-slate-500' }
  };

  function sev(severitate: string) {
    return sevConfig[severitate] || sevConfig.moderata;
  }

  function buildBugParams(options: { cursor?: string | null } = {}) {
    const params = new URLSearchParams({ take: String(PAGE_SIZE) });
    if (options.cursor) params.set('cursor', options.cursor);
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (filtruStatus) params.set('status', filtruStatus);
    if (filtruSeveritate) params.set('severitate', filtruSeveritate);
    return params;
  }

  async function incarcaBuguri(options: { append?: boolean } = {}) {
    const append = options.append === true;
    const requestId = ++loadRequestId;
    if (append) loadingMore = true;
    else {
      incarcare = true;
      nextCursor = null;
    }

    try {
      const params = buildBugParams({ cursor: append ? nextCursor : null });
      const r = await fetch(`/api/projects/${projectId}/bugs?${params.toString()}`);
      if (!r.ok) throw new Error('Eroare la încărcarea bug-urilor');
      const result = await r.json();
      if (requestId !== loadRequestId) return;

      const data = result.data || [];
      if (append) {
        const idsExistente = new Set(buguri.map(b => b.id));
        buguri = [...buguri, ...data.filter((b: any) => !idsExistente.has(b.id))];
      } else {
        buguri = data;
      }
      nextCursor = result.nextCursor || null;
      totalFiltrat = result.total || 0;
      totalBuguri = result.totalAll ?? result.total ?? 0;
      countDeschise = result.counts?.deschis || 0;
      countInLucru = result.counts?.in_lucru || 0;
      countRezolvate = result.counts?.rezolvat || 0;
      countInchise = result.counts?.inchis || 0;
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
    incarcaBuguri();
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
      incarcaBuguri();
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
    incarcaBuguri({ append: true });
  }

  function toggleExpand(id: string) {
    if (expandedCards.includes(id)) {
      expandedCards = expandedCards.filter(x => x !== id);
    } else {
      expandedCards = [...expandedCards, id];
    }
  }

  async function schimbaStatus(id: string, status: string) {
    await fetch(`/api/projects/${projectId}/bugs`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    toast.success('Status actualizat');
    await incarcaBuguri();
  }

  async function schimbaSeveritate(id: string, severitate: string) {
    await fetch(`/api/projects/${projectId}/bugs`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, severitate })
    });
    toast.success('Severitate actualizată');
    await incarcaBuguri();
  }

  async function stergeTot() {
    await fetch(`/api/projects/${projectId}/bugs`, { method: 'DELETE' });
    showStergeTot = false;
    toast.success('Bug-uri șterse');
    await incarcaBuguri();
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  $: buguriFiltrate = buguri;
  $: filtreActive = !!searchTerm.trim() || !!filtruStatus || !!filtruSeveritate;
  $: queryKey = `${searchTerm}|${filtruStatus}|${filtruSeveritate}`;
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

<svelte:window on:keydown={(e) => {
  if (e.key === '/' && !showStergeTot && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'SELECT') {
    e.preventDefault();
    document.getElementById('bugs-search')?.focus();
  }
}} />

<div class="space-y-5">
  <!-- Header -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Bug-uri</h1>
      <div class="mt-1.5 flex items-center gap-3 text-xs font-mono text-slate-400 tracking-wide flex-wrap">
        <span>{totalBuguri || buguri.length} total</span>
        <span class="text-slate-200">|</span>
        <span class="text-rose-600">{countDeschise} deschise</span>
        <span class="text-slate-200">|</span>
        <span class="text-amber-600">{countInLucru} în lucru</span>
        <span class="text-slate-200">|</span>
        <span class="text-sky-600">{countRezolvate} rezolvate</span>
        <span class="text-slate-200">|</span>
        <span class="text-emerald-600">{countInchise} închise</span>
        {#if filtreActive}
          <span class="text-slate-200">|</span>
          <span class="text-amber-600">{totalFiltrat} rezultate</span>
        {/if}
      </div>
    </div>
    {#if totalBuguri > 0}
      <button on:click={() => showStergeTot = true} class="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        Șterge tot
      </button>
    {/if}
  </div>

  <!-- Search & Filters -->
  {#if totalBuguri > 0 || filtreActive}
    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-md">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input
          id="bugs-search"
          type="text"
          bind:value={searchTerm}
          on:keydown={handleSearchKeydown}
          placeholder="Caută bug-uri..."
          class="block w-full rounded-md border border-slate-200 bg-white pl-9 pr-16 py-2 text-sm font-mono placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
        />
        <kbd class="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-mono text-slate-400 pointer-events-none">/</kbd>
      </div>
      <div class="h-8 w-px bg-slate-200"></div>
      <select bind:value={filtruStatus} class="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer">
        <option value="">Toate statusurile</option>
        <option value="deschis">Deschise</option>
        <option value="in_lucru">În lucru</option>
        <option value="rezolvat">Rezolvate</option>
        <option value="inchis">Închise</option>
      </select>
      <select bind:value={filtruSeveritate} class="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer">
        <option value="">Toate severitățile</option>
        <option value="critica">Critică</option>
        <option value="majora">Majoră</option>
        <option value="moderata">Moderată</option>
        <option value="minora">Minoră</option>
      </select>
    </div>
  {/if}

  <!-- Bug Cards -->
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
      <button on:click={() => incarcaBuguri()} class="mt-3 text-xs font-semibold text-red-700 underline underline-offset-2 decoration-red-300 hover:decoration-red-600 cursor-pointer">
        Reîncearcă
      </button>
    </div>
  {:else if totalBuguri === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-20 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
        <svg class="h-6 w-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <p class="text-sm font-medium text-slate-600">Nu există bug-uri raportate</p>
      <p class="mt-1 text-xs text-slate-400">Bug-urile apar automat când un test este marcat ca eșuat</p>
    </div>
  {:else if buguriFiltrate.length === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
      <p class="text-sm text-slate-500">Niciun bug nu corespunde filtrelor</p>
      <button on:click={() => { searchTerm = ''; filtruStatus = ''; filtruSeveritate = ''; }} class="mt-3 text-xs font-medium text-slate-600 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500 cursor-pointer">
        Resetează filtrele
      </button>
    </div>
  {:else}
    <div class="space-y-1.5">
      {#each buguriFiltrate as b (b.id)}
        {@const expanded = expandedCards.includes(b.id)}
        {@const s = cfg(b.status)}
        {@const sv = sev(b.severitate)}
        <div class="group rounded-md border border-slate-200 bg-white {s.border} border-l-[3px] hover:border-slate-300 transition-colors">
          <!-- Card Header -->
          <button
            type="button"
            on:click={() => toggleExpand(b.id)}
            class="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer"
          >
            <span class="h-2 w-2 rounded-full shrink-0 {s.dot}"></span>
            <span class="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider {s.badge}">
              {s.label}
            </span>
            <span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider {sv.badge}">
              {sv.label}
            </span>

            {#if b.test?.cod}
              <span class="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-500">{b.test.cod}</span>
            {/if}

            <span class="flex-1 truncate text-sm font-medium text-slate-800 group-hover:text-slate-900">
              {b.titlu}
            </span>

            <span class="hidden sm:block text-xs font-mono text-slate-300 shrink-0">{formatDate(b.createdAt)}</span>

            <svg class="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 {expanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>

          <!-- Expanded Details -->
          {#if expanded}
            <div transition:slide={{ duration: 150 }}>
              <div class="border-t border-slate-100 px-4 py-4">
                {#if b.descriere}
                  <div class="mb-3 rounded-md bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <p class="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{b.descriere}</p>
                  </div>
                {/if}

                {#if b.test}
                  <div class="mb-3 flex items-center gap-2">
                    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Test asociat:</span>
                    <span class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-semibold text-slate-600">{b.test.cod}</span>
                    <span class="text-xs text-slate-500">{b.test.titlu}</span>
                  </div>
                {/if}

                <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <select
                    value={b.status}
                    on:change={(e) => schimbaStatus(b.id, e.currentTarget.value)}
                    class="rounded-md border {s.select} px-3 py-1.5 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="deschis">Deschis</option>
                    <option value="in_lucru">În lucru</option>
                    <option value="rezolvat">Rezolvat</option>
                    <option value="inchis">Închis</option>
                  </select>
                  <select
                    value={b.severitate || 'moderata'}
                    on:change={(e) => schimbaSeveritate(b.id, e.currentTarget.value)}
                    class="rounded-md border {sv.badge} px-3 py-1.5 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="critica">Critică</option>
                    <option value="majora">Majoră</option>
                    <option value="moderata">Moderată</option>
                    <option value="minora">Minoră</option>
                  </select>
                </div>
              </div>
            </div>
          {/if}
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
      <span class="text-xs font-mono text-slate-300">{buguri.length} din {totalFiltrat} bug-uri</span>
    </div>
  {/if}
</div>

<!-- Delete All Modal -->
{#if showStergeTot}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" tabindex="-1" on:click={() => showStergeTot = false} on:keydown={(e) => { if (e.key === 'Escape') showStergeTot = false; }}>
    <div class="w-full max-w-md rounded-lg bg-white shadow-2xl" on:click|stopPropagation>
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h3 class="text-sm font-semibold text-slate-900">Șterge toate bug-urile</h3>
        <button on:click={() => showStergeTot = false} class="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="px-6 py-5">
        <p class="text-sm text-slate-600">Sigur doriți să ștergeți toate bug-urile din acest proiect? Acțiunea este ireversibilă.</p>
      </div>
      <div class="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
        <button on:click={() => showStergeTot = false} class="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">Anulează</button>
        <button on:click={stergeTot} class="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer">Șterge tot</button>
      </div>
    </div>
  </div>
{/if}
